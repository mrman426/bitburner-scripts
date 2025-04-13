/** @param {NS} ns */
export async function main(ns) {
    const minRam = 64; // Mimum RAM to buy
    const maxServers = 25; // Maximum number of servers you can own
    const serverPrefix = "pserv-"; // Prefix for purchased servers

    // Get current money
    const money = ns.getServerMoneyAvailable("home");
    
    // Find the maximum RAM we can afford for one server
    let maxAffordableRam = 8;
    let maxAffordableCost = ns.getPurchasedServerCost(maxAffordableRam);
    
    // Keep doubling RAM until we can't afford it
    while (true) {
        const nextRam = maxAffordableRam * 2;
        const nextCost = ns.getPurchasedServerCost(nextRam);
        
        if (nextCost > money) {
            break;
        }
        
        maxAffordableRam = nextRam;
        maxAffordableCost = nextCost;
    }

    // Don't buy servers with less than 64GB RAM
    if (maxAffordableRam < minRam) {
        ns.tprint(`Not enough money to buy a server with at least ${minRam}GB RAM`);
        return;
    }
    
    // Get list of existing purchased servers
    const existingServers = ns.getPurchasedServers();
    const availableSlots = maxServers - existingServers.length;

    if (availableSlots <= 0) {
        // Find the server with the least RAM (only considering servers with our prefix)
        let worstServer = null;
        let minRam = Infinity;
        
        for (const server of existingServers) {
            // Only consider servers that match our prefix pattern
            if (server.startsWith(serverPrefix)) {
                const ram = ns.getServerMaxRam(server);
                if (ram < minRam) {
                    minRam = ram;
                    worstServer = server;
                }
            }
        }
        
        if (worstServer && minRam < maxAffordableRam) {
            ns.tprint(`Selling worst server ${worstServer} with ${minRam}GB RAM to make room for a better one`);
            ns.deleteServer(worstServer);
            // Update the existing servers list
            existingServers.splice(existingServers.indexOf(worstServer), 1);
        } else {
            ns.tprint("All existing servers have more RAM than what we can afford. No changes made.");
            return;
        }
    }

    // Calculate how many servers we can actually buy (limited by slots and money)
    const serversToBuy = Math.min(Math.floor(money / maxAffordableCost), maxServers - existingServers.length);
    const totalCost = serversToBuy * maxAffordableCost;

    if (serversToBuy > 0) {
        ns.tprint(`Purchasing ${serversToBuy} server(s) with ${maxAffordableRam}GB RAM for $${totalCost}`);
        
        // Find the next available server number
        let nextServerNum = 0;
        while (existingServers.includes(serverPrefix + nextServerNum)) {
            nextServerNum++;
        }
        
        // Purchase servers
        for (let i = 0; i < serversToBuy; i++) {
            const serverName = serverPrefix + (nextServerNum + i);
            ns.purchaseServer(serverName, maxAffordableRam);
            ns.tprint(`Purchased server: ${serverName} with ${maxAffordableRam}GB RAM`);
        }
        
        ns.tprint(`Successfully purchased ${serversToBuy} server(s)`);
    } else {
        ns.tprint(`Not enough money to purchase a server. Need $${maxAffordableCost} for ${maxAffordableRam}GB RAM`);
    }
} 