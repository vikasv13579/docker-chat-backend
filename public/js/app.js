// Shared logic can go here
// For now, keeping page-specific logic in HTML files for simplicity in this demo, 
// or I can extract the fetch wrapper here.

window.authFetch = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
    }
    return res;
};
