/** @param {NS} ns */
export async function main(ns) {
    const maxServers = 25; // Maximum number of servers you can own
    const serverPrefix = "pserv-"; // Prefix for purchased servers

    // Get current money
    const money = ns.getServerMoneyAvailable("home");
    
    // Find the maximum RAM we can afford for one server
    let maxAffordableRam = 8; // Start with minimum RAM
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
    
    // Get list of existing purchased servers
    const existingServers = ns.getPurchasedServers();
    const availableSlots = maxServers - existingServers.length;

    if (availableSlots <= 0) {
        ns.tprint("Maximum number of servers (" + maxServers + ") already purchased");
        return;
    }

    // Calculate how many servers we can actually buy (limited by slots and money)
    const serversToBuy = Math.min(Math.floor(money / maxAffordableCost), availableSlots);
    const totalCost = serversToBuy * maxAffordableCost;

    if (serversToBuy > 0) {
        ns.tprint(`Purchasing ${serversToBuy} server(s) with ${maxAffordableRam}GB RAM for $${totalCost}`);
        
        // Purchase servers
        for (let i = 0; i < serversToBuy; i++) {
            const serverName = serverPrefix + (existingServers.length + i);
            ns.purchaseServer(serverName, maxAffordableRam);
            ns.tprint(`Purchased server: ${serverName} with ${maxAffordableRam}GB RAM`);
        }
        
        ns.tprint(`Successfully purchased ${serversToBuy} server(s)`);
    } else {
        ns.tprint(`Not enough money to purchase a server. Need $${maxAffordableCost} for ${maxAffordableRam}GB RAM`);
    }
} 