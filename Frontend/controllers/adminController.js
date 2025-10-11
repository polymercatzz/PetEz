// Admin Controller

const adminController = {
    // View controllers
    getAdminHome: (req, res) => {
        res.render('admin/admin_home', { title: 'Admin Dashboard' });
    },

    getUsers: (req, res) => {
        res.render('admin/admin_manage_user', { title: 'Manage Users' });
    },

    getBookings: (req, res) => {
        res.render('admin/admin_booking', { title: 'Manage Bookings' });
    },

    getApproval: (req, res) => {
        res.render('admin/admin_approval', { title: 'Approval Management' });
    },
};

module.exports = adminController;