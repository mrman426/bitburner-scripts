/** @param {NS} ns */
export async function main(ns) {
    const args = ns.flags([["help", false], ["host", ""]]);
    if (args.help) {
        ns.tprint("This script scans the network and displays server information.");
        ns.tprint(`Usage: run ${ns.getScriptName()} [--host <hostname>]`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()} --host n00dles`);
        return;
    }

    // If a host is specified, show only that host's details
    if (args.host) {
        const server = args.host;
        if (!ns.serverExists(server)) {
            ns.tprint(`Server '${server}' does not exist!`);
            return;
        }

        const serverInfo = ns.getServer(server);
        const path = findPathToServer(ns, server).join(" -> ");
        
        ns.tprint("\n=== Server Details ===");
        ns.tprint(`Server Name: ${server}`);
        ns.tprint(`Path: ${path}`);
        ns.tprint(`Security Level: ${serverInfo.hackDifficulty.toFixed(2)}`);
        ns.tprint(`Max Money: ${formatMoney(serverInfo.moneyMax)}`);
        ns.tprint(`Required Hacking Level: ${serverInfo.requiredHackingSkill}`);
        ns.tprint(`RAM: ${serverInfo.maxRam}GB`);
        ns.tprint(`Root Access: ${serverInfo.hasAdminRights ? "Yes" : "No"}`);
        return;
    }

    // Get all servers
    const servers = scanAllServers(ns);
    
    // Find the path to each server
    const serverPaths = {};
    for (const server of servers) {
        serverPaths[server] = findPathToServer(ns, server);
    }

    // Display servers with their paths
    ns.tprint("\n=== Network Scan Results ===");
    ns.tprint("Server Name".padEnd(20) + "Security".padEnd(12) + "Money".padEnd(15) + "Required Hacking Level".padEnd(20) + "Path");
    ns.tprint("-".repeat(100));

    for (const server of servers) {
        const serverInfo = ns.getServer(server);
        const path = serverPaths[server].join(" -> ");
        ns.tprint(
            server.padEnd(20) +
            serverInfo.hackDifficulty.toFixed(2).padEnd(12) +
            formatMoney(serverInfo.moneyMax).padEnd(15) +
            serverInfo.requiredHackingSkill.toString().padEnd(20) +
            path
        );
    }
}

/**
 * Recursively scans all servers in the network
 * @param {NS} ns
 * @param {string} server - The server to scan
 * @param {Set<string>} found - Set of already found servers
 * @returns {string[]} Array of all server names
 */
function scanAllServers(ns, server = "home", found = new Set()) {
    if (found.has(server)) return Array.from(found);
    
    found.add(server);
    const connected = ns.scan(server);
    
    for (const nextServer of connected) {
        scanAllServers(ns, nextServer, found);
    }
    
    return Array.from(found);
}

/**
 * Finds the path from home to the target server
 * @param {NS} ns
 * @param {string} targetServer
 * @returns {string[]} Array of server names in the path
 */
function findPathToServer(ns, targetServer) {
    const path = [];
    let current = targetServer;
    
    while (current !== "home") {
        path.unshift(current);
        current = ns.scan(current)[0]; // Get the first connected server (parent)
    }
    path.unshift("home");
    
    return path;
}

/**
 * Formats money values for display
 * @param {number} money
 * @returns {string}
 */
function formatMoney(money) {
    if (money === 0) return "$0";
    const suffixes = ["", "K", "M", "B", "T"];
    const suffixNum = Math.floor(Math.log10(money) / 3);
    const shortValue = money / Math.pow(1000, suffixNum);
    return "$" + shortValue.toFixed(2) + suffixes[suffixNum];
} 