/** @param {NS} ns */
export async function main(ns) {
    // Function to get all servers in the network
    function getAllServers() {
        const servers = new Set();
        const toScan = ["home"];
        
        while (toScan.length > 0) {
            const server = toScan.pop();
            if (servers.has(server)) continue;
            servers.add(server);
            
            const connected = ns.scan(server);
            for (const s of connected) {
                if (!servers.has(s)) {
                    toScan.push(s);
                }
            }
        }
        
        return Array.from(servers);
    }

    // Get all servers
    const allServers = getAllServers();
    const purchasedServers = ns.getPurchasedServers();
    
    // Print header
    ns.tprint("\nServer Information:");
    ns.tprint("========================================================");
    ns.tprint("Server Name\t\tRAM\t\tRoot\tSecurity\tHacking Level");
    ns.tprint("========================================================");
    
    // Sort servers alphabetically
    allServers.sort();
    
    // Print information for each server
    for (const server of allServers) {
        const ram = ns.getServerMaxRam(server);
        const hasRoot = ns.hasRootAccess(server);
        const security = ns.getServerSecurityLevel(server).toFixed(2);
        const hackingLevel = ns.getServerRequiredHackingLevel(server);
        const isPurchased = purchasedServers.includes(server);
        
        // Format the output
        const serverType = isPurchased ? "[PURCHASED]" : "";
        ns.tprint(`${server}${serverType}\t\t${ram}GB\t\t${hasRoot ? "Yes" : "No"}\t${security}\t\t${hackingLevel}`);
    }
    
    ns.tprint("========================================================");
    ns.tprint(`Total Servers: ${allServers.length} (${purchasedServers.length} purchased)`);
} 