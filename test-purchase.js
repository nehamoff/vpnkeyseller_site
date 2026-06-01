import jwt from "jsonwebtoken";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function test() {
    try {
        console.log("🧪 Testing Full VPN Key Purchase Flow\n");

        // 1. Create test user
        console.log("1️⃣ Creating test user...");
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = "TestPassword123";
        const passwordHash = await bcrypt.hash(testPassword, 10);

        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, email_verified)
             VALUES ($1, $2, true)
             ON CONFLICT (email) DO UPDATE
             SET password_hash = EXCLUDED.password_hash, email_verified = true
             RETURNING id, email`,
            [testEmail, passwordHash]
        );

        const user = userResult.rows[0];
        console.log(`✅ User created: ${user.email} (ID: ${user.id})\n`);

        // 2. Generate JWT token
        console.log("2️⃣ Generating JWT token...");
        const token = jwt.sign(
            { sub: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        console.log(`✅ Token generated\n`);

        // 3. Test purchase endpoint
        console.log("3️⃣ Testing POST /api/purchases...");
        const purchaseRes = await fetch("http://localhost:3001/api/purchases", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                package_name: "Профессиональный",
                price: 599,
                days_count: 30
            })
        });

        console.log(`Response status: ${purchaseRes.status}`);
        const purchaseData = await purchaseRes.json();
        console.log("Response:", JSON.stringify(purchaseData, null, 2));

        if (purchaseRes.ok) {
            console.log("\n✅ Purchase created successfully!");
            console.log("Purchase ID:", purchaseData.purchase?.id);
            console.log("VPN Key:", purchaseData.purchase?.remnawave_inbound_id);
            console.log("Expires at:", purchaseData.purchase?.expires_at);
        } else {
            console.log("\n❌ Purchase failed!");
        }

        // 4. Check purchases list
        console.log("\n4️⃣ Testing GET /api/purchases...");
        const listRes = await fetch("http://localhost:3001/api/purchases", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const listData = await listRes.json();
        console.log("Purchases:", JSON.stringify(listData.purchases, null, 2));

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

test();
