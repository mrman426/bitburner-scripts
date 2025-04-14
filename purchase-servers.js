import { log } from "./utils/console.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return args.length === 0 ? ["--verbose", "--loop"] : data.servers;
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const verbose = ns.args.includes("--verbose");
    const loop = ns.args.includes("--loop");
    const minRam = 64; // Mimum RAM to buy
    const maxServers = 25; // Maximum number of servers you can own
    const serverPrefix = "pserv-"; // Prefix for purchased servers
    const sleepTime = 60000; // Sleep for 1 minute between checks

    do {
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

        log(ns, `========================================`, verbose);

        // Don't buy servers with less than 64GB RAM
        if (maxAffordableRam < minRam) {
            log(ns, `WARNINIG: Not enough money to buy a server with at least ${minRam}GB RAM. Checking again in ${sleepTime/1000} seconds...`, verbose);
            await ns.sleep(sleepTime);
            continue;
        }
        
        // Get list of existing purchased servers
        const existingServers = ns.getPurchasedServers();
        const availableSlots = maxServers - existingServers.length;

        // Get the maximum RAM of currently owned servers
        let maxOwnedRam = 0;
        for (const server of existingServers) {
            const ram = ns.getServerMaxRam(server);
            if (ram > maxOwnedRam) {
                maxOwnedRam = ram;
            }
        }

        // Don't buy servers with less RAM than the owned server with the most RAM
        if (maxAffordableRam <= maxOwnedRam) {
            log(ns, `WARNINIG: Not purchasing a server with ${maxAffordableRam}GB RAM as it is less than or equal to the maximum owned server RAM (${maxOwnedRam}GB). Checking again in ${sleepTime / 1000} seconds...`, verbose);
            await ns.sleep(sleepTime);
            continue;
        }

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
                log(ns, `INFO: Selling worst server ${worstServer} with ${minRam}GB RAM to make room for a better one`, verbose);
                
                // Kill all running scripts on the server before deletion
                ns.killall(worstServer);
                
                if (!ns.deleteServer(worstServer)) {
                    log(ns, `ERROR: Cannot sell server`, verbose);
                    await ns.sleep(sleepTime);
                    continue;
                }
                // Wait a short time to ensure deletion is complete
                await ns.sleep(100);
                // Update the existing servers list
                existingServers.splice(existingServers.indexOf(worstServer), 1);
            } else {
                log(ns, `WARNING: All existing servers have more RAM than what we can afford. Checking again in ${sleepTime/1000} seconds...`, verbose);
                await ns.sleep(sleepTime);
                continue;
            }
        }

        // Calculate how many servers we can actually buy (limited by slots and money)
        const serversToBuy = Math.min(Math.floor(money / maxAffordableCost), maxServers - existingServers.length);
        const totalCost = serversToBuy * maxAffordableCost;

        if (serversToBuy > 0) {
            // Find the next available server number
            let nextServerNum = 0;
            while (existingServers.includes(serverPrefix + nextServerNum)) {
                nextServerNum++;
            }
            
            // Purchase servers
            for (let i = 0; i < serversToBuy; i++) {
                const serverName = serverPrefix + (nextServerNum + i);
                ns.purchaseServer(serverName, maxAffordableRam);
                log(ns, `Purchased server: ${serverName} with ${maxAffordableRam}GB RAM for $${ns.formatNumber(totalCost)}`, verbose);
            }
        } else {
            log(ns, `Not enough money to purchase a server. Need $${ns.formatNumber(maxAffordableCost)} for ${maxAffordableRam}GB RAM. Checking again in ${sleepTime/1000} seconds...`, verbose);
        }

        // Sleep before next iteration
        await ns.sleep(sleepTime);
    } while (loop);
}