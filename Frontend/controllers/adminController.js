// Admin Controller

const adminController = {
    // View controllers
    getAdminHome: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
    let users = [];
    let sitters = [];
    let bookings = [];
    let revenueSummary = { totalRevenue: 0, monthly: { labels: [], series: [] } };

        const dockerUsers = 'http://auth-service:3002/api/users/all';
        const localUsers = 'http://localhost:3002/api/users/all';
    const dockerSitters = 'http://auth-service:3002/api/sitters/all';
    const localSitters = 'http://localhost:3002/api/sitters/all';

        async function fetchList(url, key, token) {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const resp = await fetch(url, { headers });
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
            const token = req.session.token;
            const dockerBookings = 'http://booking-service:3006/admin/bookings';
            const localBookings = 'http://localhost:3006/admin/bookings';
            const PAYMENT_BASE = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3007';
            const dockerRevenue = `${PAYMENT_BASE}/admin/revenue/summary`;
            const localRevenue = 'http://127.0.0.1:3007/admin/revenue/summary';

            async function fetchBookings(url, token) {
                const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!resp.ok) {
                    const text = await resp.text().catch(() => '');
                    throw new Error(`GET ${url} failed: ${resp.status} ${text}`);
                }
                const data = await resp.json();
                return data.bookings || [];
            }

            async function fetchRevenueWithRetry(primaryUrl, token, retries = 3, delayMs = 600) {
                for (let attempt = 0; attempt < retries; attempt++) {
                    try {
                        const resp = await fetch(primaryUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                        if (!resp.ok) {
                            const text = await resp.text().catch(() => '');
                            throw new Error(`GET ${primaryUrl} failed: ${resp.status} ${text}`);
                        }
                        return await resp.json();
                    } catch (err) {
                        if (attempt === retries - 1) throw err;
                        await new Promise(r => setTimeout(r, delayMs));
                    }
                }
            }

            [users, sitters, bookings, revenueSummary] = await Promise.all([
                fetchList(dockerUsers, 'users', token).catch(() => fetchList(localUsers, 'users', token)),
                fetchList(dockerSitters, 'sitters', token).catch(() => fetchList(localSitters, 'sitters', token)),
                fetchBookings(dockerBookings, token).catch(() => fetchBookings(localBookings, token)),
                // Prefer configured/payment-service URL with retry; only fallback to 127.0.0.1 for local dev
                fetchRevenueWithRetry(dockerRevenue, token)
                    .catch(() => fetchRevenueWithRetry(localRevenue, token)),
            ]);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            // show page with what we have
        }

        // Compute current month stats
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const bookingsThisMonth = (bookings || []).filter(b => {
            const sd = new Date(b.start_date);
            return sd >= startOfMonth && sd <= endOfMonth;
        });
        const bookingsCountMonth = bookingsThisMonth.length;
        const revenueMonth = bookingsThisMonth.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
        const serviceTypes = ['sitting', 'walking', 'boarding', 'grooming'];
        const labelMap = { sitting: 'ฝากเลี้ยง', walking: 'พาเดิน', boarding: 'ไปดูแลที่บ้าน', grooming: 'อาบน้ำ' };
        const serviceCountMap = bookingsThisMonth.reduce((acc, b) => {
            const k = b.service_type || 'sitting';
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {});
        const serviceCounts = serviceTypes.map(k => ({ key: k, label: labelMap[k], count: serviceCountMap[k] || 0 }));

        res.render('admin/admin_home', { 
            title: 'Admin Dashboard', 
            users, 
            sitters,
            stats: {
                bookingsCountMonth,
                revenueMonth,
                serviceCounts,
                revenueTotal: Number(revenueSummary.totalRevenue || 0),
                revenueMonthly: revenueSummary.monthly || { labels: [], series: [] }
            }
        });
    },

    getUsers: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        let users = [];
        let sitters = [];

        const dockerUsers = 'http://auth-service:3002/api/users/all';
        const localUsers = 'http://localhost:3002/api/users/all';
        const dockerSitters = 'http://auth-service:3002/api/sitters/all';
        const localSitters = 'http://localhost:3002/api/sitters/all';

        async function fetchList(url, key, token) {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const resp = await fetch(url, { headers });
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
            const token = req.session.token;
            [users, sitters] = await Promise.all([
                fetchList(dockerUsers, 'users', token).catch(() => fetchList(localUsers, 'users', token)),
                fetchList(dockerSitters, 'sitters', token).catch(() => fetchList(localSitters, 'sitters', token)),
            ]);
        } catch (error) {
            console.error('Error fetching users/sitters:', error);
        }

        res.render('admin/admin_manage_user', { title: 'Manage Users', users, sitters });
    },

    getBookings: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }

        const dockerUrl = 'http://booking-service:3006/admin/bookings';
        const localUrl = 'http://localhost:3006/admin/bookings';

        async function fetchBookings(url, token) {
            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!resp.ok) {
                const text = await resp.text().catch(() => '');
                throw new Error(`GET ${url} failed: ${resp.status} ${text}`);
            }
            return (await resp.json()).bookings || [];
        }

        let bookings = [];
        try {
            const token = req.session.token;
            bookings = await fetchBookings(dockerUrl, token).catch(() => fetchBookings(localUrl, token));
        } catch (err) {
            console.error('Error fetching admin bookings:', err.message || err);
        }

        res.render('admin/admin_booking', { title: 'Manage Bookings', bookings });
    },

    getApproval: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        res.render('admin/admin_approval', { title: 'Approval Management' });
    },
};

module.exports = adminController;