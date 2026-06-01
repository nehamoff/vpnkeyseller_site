async function test() {
    console.log("Testing API endpoints...\n");

    // Test health check
    console.log("1. Testing /api/health");
    try {
        const res = await fetch("http://localhost:3001/api/health");
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch (e) {
        console.log("Error:", e.message);
    }

    console.log("\n2. Testing /api/auth/register");
    try {
        const res = await fetch("http://localhost:3001/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "test" + Math.random().toString().slice(2) + "@example.com",
                password: "TestPassword123"
            })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
}

test();
