#!/usr/bin/env node
/**
 * Diagnostic script to test VPN key creation
 */

import fetch from 'node-fetch';

async function test() {
    console.log("🧪 Testing VPN Key Creation\n");

    // Test 1: Check if server is running
    console.log("1️⃣ Checking if server is running...");
    try {
        const healthCheck = await fetch("http://localhost:3001/api/health");
        if (healthCheck.ok) {
            console.log("✅ Server is running\n");
        } else {
            console.log("❌ Server returned", healthCheck.status, "\n");
            return;
        }
    } catch (e) {
        console.log("❌ Cannot connect to server at http://localhost:3001\n");
        console.log("Make sure to run: npm run dev in the server directory\n");
        return;
    }

    // Test 2: Check Python script
    console.log("2️⃣ Checking Python integration...");
    try {
        const { spawn } = await import('child_process');
        const pythonProcess = spawn("python", ["server/remnawave_integration.py", "create", "test@example.com", "1", "30"]);

        let pythonOutput = "";
        pythonProcess.stdout.on("data", (data) => {
            pythonOutput += data.toString();
        });

        pythonProcess.on("close", (code) => {
            try {
                const result = JSON.parse(pythonOutput);
                if (result.success) {
                    console.log("✅ Python script works\n");
                    console.log("Response:", result, "\n");
                } else {
                    console.log("❌ Python script returned error:", result.error, "\n");
                }
            } catch (e) {
                console.log("❌ Python script output is not valid JSON\n");
                console.log("Output:", pythonOutput, "\n");
            }
        });
    } catch (e) {
        console.log("❌ Error testing Python:", e.message, "\n");
    }

    // Test 3: Check environment variables
    console.log("3️⃣ Checking environment variables...");
    const required = ["REMNAWAVE_BASE_URL", "REMNAWAVE_TOKEN", "REMNAWAVE_ADMIN_LOGIN", "REMNAWAVE_ADMIN_PASSWORD"];
    const env = require('dotenv').config({ path: 'server/.env' });

    let allSet = true;
    required.forEach(key => {
        if (process.env[key]) {
            console.log(`✅ ${key} is set`);
        } else {
            console.log(`❌ ${key} is NOT set`);
            allSet = false;
        }
    });

    if (allSet) {
        console.log("\n✅ All environment variables are set\n");
    } else {
        console.log("\n⚠️  Some environment variables are missing\n");
    }
}

test();
