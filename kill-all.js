/** @param {NS} ns */
export async function main(ns) {
    const visited = new Set();
    
    // Recursive function to scan all servers
    function scanAll(server) {
        if (visited.has(server)) return;
        visited.add(server);
        
        // Kill all scripts on current server
        ns.killall(server);
        
        // Scan connected servers
        const connected = ns.scan(server);
        for (const s of connected) {
            scanAll(s);
        }
    }
    
    // Start scanning from home
    scanAll('home');
    
    ns.tprint('All scripts have been killed on all servers.');
} 