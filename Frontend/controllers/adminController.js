// Admin Controller

const adminController = {
    // View controllers
    getAdminHome: async (req, res) => {
        let users = [];
        let sitters = [];

        const dockerUsers = 'http://auth-service:3002/api/users/all';
        const localUsers = 'http://localhost:3002/api/users/all';
        const dockerSitters = 'http://auth-service:3002/api/sitters/all';
        const localSitters = 'http://localhost:3002/api/sitters/all';

        async function fetchList(url, key) {
            const resp = await fetch(url);
            if (!resp.ok) {
                const text = await resp.text().catch(() => '');
                throw new Error(`GET ${url} failed: ${resp.status} ${text}`);
            }
            const data = await resp.json();
            if (Array.isArray(data)) return data;
            if (key && data[key]) return data[key];
            return data.users || data.sitters || [];
        }

        try {
            [users, sitters] = await Promise.all([
                fetchList(dockerUsers, 'users').catch(() => fetchList(localUsers, 'users')),
                fetchList(dockerSitters, 'sitters').catch(() => fetchList(localSitters, 'sitters')),
            ]);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            // show page with what we have
        }

        res.render('admin/admin_home', { title: 'Admin Dashboard', users, sitters });
    },

    getUsers: async (req, res) => {
        let users = [];
        let sitters = [];

        const dockerUsers = 'http://auth-service:3002/api/users/all';
        const localUsers = 'http://localhost:3002/api/users/all';
        const dockerSitters = 'http://auth-service:3002/api/sitters/all';
        const localSitters = 'http://localhost:3002/api/sitters/all';

        async function fetchList(url, key) {
            const resp = await fetch(url);
            if (!resp.ok) {
                const text = await resp.text().catch(() => '');
                throw new Error(`GET ${url} failed: ${resp.status} ${text}`);
            }
            const data = await resp.json();
            if (Array.isArray(data)) return data;
            if (key && data[key]) return data[key];
            return data.users || data.sitters || [];
        }

        try {
            [users, sitters] = await Promise.all([
                fetchList(dockerUsers, 'users').catch(() => fetchList(localUsers, 'users')),
                fetchList(dockerSitters, 'sitters').catch(() => fetchList(localSitters, 'sitters')),
            ]);
        } catch (error) {
            console.error('Error fetching users/sitters:', error);
        }

        res.render('admin/admin_manage_user', { title: 'Manage Users', users, sitters });
    },

    getBookings: (req, res) => {
        res.render('admin/admin_booking', { title: 'Manage Bookings' });
    },

    getApproval: (req, res) => {
        res.render('admin/admin_approval', { title: 'Approval Management' });
    },
};

module.exports = adminController;