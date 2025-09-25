frappe.ui.form.on('Task', {
    refresh: function(frm) {
        // --- Create GitHub Issue ---
        frm.add_custom_button(__('Create GitHub Issue'), function() {
            let repo = frm.doc.github_repo;
            if (!repo) {
                frappe.msgprint(__('Please set the GitHub Repo (link to Repository) in the Task field "GitHub Repo"'));
                return;
            }

            frappe.prompt([
                {'fieldname':'title','fieldtype':'Data','label':'Issue Title','reqd':1},
                {'fieldname':'body','fieldtype':'Text','label':'Issue Body'}
            ], function(values){
                frappe.call({
                    method: 'erpnext_github_integration.github_api.create_issue',
                    args: {repository: repo, title: values.title, body: values.body},
                    callback: function(r) {
                        if (r.message) {
                            let issue = r.message.issue;

                            frm.set_value('github_issue_doc', r.message.local_doc);
                            frm.set_value('github_issue_number', issue.number);
                            frm.save();
                            frappe.msgprint(__('Issue Successfully Created'));
                        }
                    }
                });
            }, __('Create GitHub Issue'));
        }, __('GitHub'));

        // --- Create Pull Request ---
        frm.add_custom_button(__('Create Pull Request'), function() {
            let repo = frm.doc.github_repo;
            if (!repo) {
                frappe.msgprint(__('Please set the GitHub Repo (link to Repository) in the Task field "GitHub Repo"'));
                return;
            }
            frappe.prompt([
                {'fieldname':'title','fieldtype':'Data','label':'PR Title','reqd':1},
                {'fieldname':'head','fieldtype':'Data','label':'Head Branch (feature-branch)','reqd':1},
                {'fieldname':'base','fieldtype':'Data','label':'Base Branch (e.g. main)','reqd':1},
                {'fieldname':'body','fieldtype':'Text','label':'PR Body'}
            ], function(values){
                frappe.call({
                    method: 'erpnext_github_integration.github_api.create_pull_request',
                    args: {repository: repo, title: values.title, head: values.head, base: values.base, body: values.body},
                    callback: function(r) {
                        if (r.message) {
                            let pr = r.message.pull_request;
                            frappe.msgprint(__('Pull Request Created Successfully'));
                            frm.set_value('github_pr_number', pr.number);
                            frm.save();
                        }
                    }
                });
            }, __('Create Pull Request'));
        }, __('GitHub'));

        // --- Assign Issue ---
        frm.add_custom_button(__('Assign Issue'), function() {
            let repo = frm.doc.github_repo;
            let issue_no = frm.doc.github_issue_number;

            if (!repo || !issue_no) {
                frappe.msgprint(__('This Task must have GitHub Repo and GitHub Issue Number set.'));
                return;
            }

            frappe.db.get_list('User', {
                fields: ['name', 'full_name', 'github_username'],
                filters: { enabled: 1 },
                limit: 100
            }).then(users => {
                let user_options = users.map(u => ({
                    value: u.github_username || '',
                    label: `${u.full_name || u.name} (${u.github_username || 'no GitHub'})`
                }));

                frappe.prompt([
                    {
                        fieldname: 'assignees',
                        fieldtype: 'MultiSelectPills',
                        label: 'Assign to Users',
                        options: user_options,
                        reqd: 1
                    }
                ], function(values) {
                    frappe.call({
                        method: 'erpnext_github_integration.github_api.assign_issue',
                        args: {
                            repo_full_name: repo,
                            issue_number: issue_no,
                            assignees: values.assignees
                        },
                        callback: function(r) {
                            frappe.msgprint(__('Issue Assigned Successfully'));
                        }
                    });
                }, __('Assign Issue'));
            });
        }, __('GitHub'));

        // --- Assign PR Reviewer ---
        frm.add_custom_button(__('Assign PR Reviewer'), function() {
            let repo = frm.doc.github_repo;
            let pr_number = frm.doc.github_pr_number;

            if (!repo || !pr_number) {
                frappe.msgprint(__('This Task must have GitHub Repo and GitHub PR Number set.'));
                return;
            }

            frappe.db.get_list('User', {
                fields: ['name', 'full_name', 'github_username'],
                filters: { enabled: 1, github_username: ['!=', ''] },
                limit: 100
            }).then(users => {
                let user_options = users.map(u => ({
                    value: u.github_username,
                    label: `${u.full_name || u.name} (${u.github_username})`
                }));

                frappe.prompt([
                    {
                        fieldname: 'reviewers',
                        fieldtype: 'MultiSelectPills',
                        label: 'Reviewers',
                        options: user_options,
                        reqd: 1
                    }
                ], function(values) {
                    let selected = values.reviewers || [];

                    frappe.call({
                        method: 'erpnext_github_integration.github_api.add_pr_reviewer',
                        args: {
                            repo_full_name: repo,
                            pr_number: pr_number,
                            reviewers: selected
                        },
                        callback: function(r) {
                            if (r.message) {
                                frappe.msgprint("Message: " + r.message);
                                frappe.msgprint(__('Reviewers assigned to PR Successfully'));
                            }
                        }
                    });
                }, __('Assign PR Reviewer'));
            });
        }, __('GitHub'));
    }
});