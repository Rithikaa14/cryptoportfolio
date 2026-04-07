const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = 'https://hgmfrximajquqogarrlp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbWZyeGltYWpxdXFvZ2FycmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzU3NDIsImV4cCI6MjA4ODcxMTc0Mn0.ZjlIygeZk8S_kB7ozMco0uYJ287H8hYGaI6czBi_OLs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApi() {
    console.log("Signing up test user...");
    const email = `test${Date.now()}@example.com`;
    const { data, error } = await supabase.auth.signUp({
        email,
        password: 'password123'
    });

    if (error) {
        console.error("Supabase Error:", error.message);
        return;
    }

    const token = data.session?.access_token;
    if (!token) {
        console.log("No token obtained, user might need email verification or already exists.");
        return;
    }

    console.log("Got token. Testing POST /api/exchanges/connect ...");

    try {
        const res = await axios.post('http://localhost:8080/api/exchanges/connect', {
            exchangeName: 'Binance',
            apiKey: 'binance-api-key',
            apiSecret: 'binance-api-secret'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("SUCCESS! Status:", res.status);
        console.log(res.data);
    } catch (err) {
        console.error("API Call Failed:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

testApi();
