import { spawn } from "child_process";

const PYTHON_BIN = process.env.PYTHON_BIN || "python3";

/**
 * Запуск Python-скрипта с жёстким таймаутом (защита от 504 nginx).
 */
export function executePythonScript(scriptPath, args, options = {}) {
    const timeoutMs = Number(options.timeoutMs || process.env.PYTHON_SCRIPT_TIMEOUT_MS || 25000);
    const logPrefix = options.logPrefix || "[Python]";

    return new Promise((resolve, reject) => {
        console.log(`${logPrefix} ${PYTHON_BIN} ${scriptPath} ${args.join(" ")} (timeout ${timeoutMs}ms)`);

        const pythonProcess = spawn(PYTHON_BIN, [scriptPath, ...args], {
            env: { ...process.env, PYTHONUNBUFFERED: "1" },
            stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        let settled = false;

        const finish = (fn) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            fn();
        };

        const timer = setTimeout(() => {
            pythonProcess.kill("SIGKILL");
            finish(() => {
                reject(
                    new Error(
                        `${logPrefix} timeout after ${timeoutMs}ms. ${stderr.slice(-300)}`
                    )
                );
            });
        }, timeoutMs);

        pythonProcess.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            stderr += data.toString();
            if (options.logStderr !== false) {
                console.error(`${logPrefix} stderr`, data.toString());
            }
        });

        pythonProcess.on("error", (error) => {
            finish(() => reject(new Error(`Failed to spawn Python: ${error.message}`)));
        });

        pythonProcess.on("close", (code) => {
            finish(() => {
                try {
                    const result = JSON.parse(stdout || "{}");
                    if (options.acceptFailure) {
                        resolve({ result, code, stderr });
                        return;
                    }
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || `Process exited with code ${code}`));
                    }
                } catch (e) {
                    reject(
                        new Error(
                            `Failed to parse Python output: ${e.message}. Stderr: ${stderr.slice(-500)}`
                        )
                    );
                }
            });
        });
    });
}
