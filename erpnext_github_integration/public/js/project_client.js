frappe.ui.form.on('Project', {
    refresh: async function(frm) {
        const response = await frappe.db.get_value('GitHub Settings', 'GitHub Settings', 'enabled');
        const github_enabled = cint(response?.message?.enabled);

        if (github_enabled !== 1) {
            frm.toggle_display('repository', false)
            frm.toggle_display('auto_create_github_issues', false)
            return;
        }
        
        // Helper function to keep our button logic DRY
        const get_valid_repo = () => {
            const repo = frm.doc.repository;
            if (!repo) {
                frappe.msgprint({
                    title: __('Missing Link'),
                    indicator: 'orange',
                    message: __('Please link a Repository record to this Project first.')
                });
                return null;
            }
            return repo;
        };

        // Sync Members Button
        frm.add_custom_button(__('Sync Members from Repository'), () => {
            const repo = get_valid_repo();
            if (!repo) return;

            frappe.call({
                method: 'erpnext_github_integration.github_api.sync_repo_members',
                args: { repo_full_name: repo },
                freeze: true, // Prevents UI interactions while the API is running
                freeze_message: __('Syncing Members...'),
                callback: function(r) {
                    frappe.show_alert({ message: __('Members synced successfully!'), indicator: 'green' });
                    frm.reload_doc();
                }
            });
        }, __('GitHub'));

        // Sync Data Button
        frm.add_custom_button(__('Sync Repository Data'), () => {
            const repo = get_valid_repo();
            if (!repo) return;

            frappe.call({
                method: 'erpnext_github_integration.github_api.sync_repo',
                args: { repository: repo },
                freeze: true,
                freeze_message: __('Pulling Repository Data...'),
                callback: function(r) {
                    frappe.show_alert({ message: __('Repository sync completed.'), indicator: 'green' });
                    frm.reload_doc();
                },
                error: function(err) {
                    frappe.msgprint({
                        title: __('Sync Failed'),
                        indicator: 'red',
                        message: __('Error during sync. Check the console or error logs.')
                    });
                }
            });
        }, __('GitHub'));
    }
});