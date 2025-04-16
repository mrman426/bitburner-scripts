import { formatMoney, formatRam, log } from "./utils/console.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return ["--verbose", "--loop"];
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const verbose = ns.args.includes("--verbose");
    const loop = ns.args.includes("--loop");
    const minRam = 64; // Mimum RAM to buy
    const maxServers = 25; // Maximum number of servers you can own
    const serverPrefix = "pserv-"; // Prefix for purchased servers
    const sleepTime = 10000; // Sleep for 10 seconds between checks
    const maxGameRam = 1048576; // Maximum RAM allowed in the game

    do {
        // Get current money
        const money = ns.getServerMoneyAvailable("home");
        
        // Find the maximum RAM we can afford for one server
        let maxAffordableRam = 8;
        let maxAffordableCost = ns.getPurchasedServerCost(maxAffordableRam);
        let nextAffordableRam = 0;
        let nextAffordableCost = 0;
        
        // Keep doubling RAM until we can't afford it
        while (true) {
            nextAffordableRam = maxAffordableRam * 2;
            nextAffordableCost = ns.getPurchasedServerCost(nextAffordableRam);
            
            if (nextAffordableCost > money) {
                break;
            }
            
            maxAffordableRam = nextAffordableRam;
            maxAffordableCost = nextAffordableCost;
        }

        log(ns, `========================================`, verbose);

        // Don't buy servers with less than 64GB RAM
        if (maxAffordableRam < minRam) {
            log(ns, `WARNINIG: Not enough money to buy a server with at least ${minRam}GB RAM.`, verbose);

            if (loop) {
                log(ns, `INFO: Checking again in ${sleepTime / 1000} seconds...`, verbose)
                await ns.sleep(sleepTime);
            }

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
        if (maxAffordableRam <= maxOwnedRam && maxAffordableRam < maxGameRam) {
            log(ns, `WARNINIG: Not purchasing a server with ${formatRam(ns, maxAffordableRam)} RAM for ${formatMoney(ns, maxAffordableCost)} as it is less than or equal to the maximum owned server RAM (${formatRam(ns, maxOwnedRam)}). Need ${formatRam(ns, maxOwnedRam*2)} RAM for ${formatMoney(ns, ns.getPurchasedServerCost(maxOwnedRam*2))}.`, verbose);

            if (loop) {
                log(ns, `INFO: Checking again in ${sleepTime / 1000} seconds...`, verbose)
                await ns.sleep(sleepTime);
            }

            continue;
        }

        // Check if all servers have maxGameRam
        const allMaxedOut = existingServers.every(server => ns.getServerMaxRam(server) === maxGameRam);
        if (allMaxedOut && existingServers.length === maxServers) {
            log(ns, `INFO: All ${maxServers} servers have reached the maximum RAM (${formatRam(ns, maxGameRam)}). Exiting script.`, true);
            break;
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
                log(ns, `INFO: Selling worst server ${worstServer} with ${formatRam(ns, minRam)}GB RAM to make room for a better one`, verbose);
                
                // Kill all running scripts on the server before deletion
                ns.killall(worstServer);
                
                if (!ns.deleteServer(worstServer)) {
                    log(ns, `ERROR: Cannot sell server`, verbose);

                    if (loop) {
                        log(ns, `INFO: Checking again in ${sleepTime / 1000} seconds...`, verbose)
                        await ns.sleep(sleepTime);
                    }
            
                    continue;
                }
                // Wait a short time to ensure deletion is complete
                await ns.sleep(100);
                // Update the existing servers list
                existingServers.splice(existingServers.indexOf(worstServer), 1);
            } else {
                log(ns, `WARNING: All existing servers have more RAM than what we can afford.`, verbose);

                if (loop) {
                    log(ns, `INFO: Checking again in ${sleepTime / 1000} seconds...`, verbose)
                    await ns.sleep(sleepTime);
                }
        
                continue;
            }
        }

        // If maxAffordableRam reaches the game limit, buy one server immediately
        if (maxAffordableRam === maxGameRam) {
            log(ns, `INFO: Maximum RAM (${formatRam(ns, maxGameRam)}) reached. Buying one server immediately.`, verbose);

            // Find the next available server number
            let nextServerNum = 0;
            while (existingServers.includes(serverPrefix + nextServerNum)) {
                nextServerNum++;
            }

            const serverName = serverPrefix + nextServerNum;
            ns.purchaseServer(serverName, maxGameRam);
            log(ns, `SUCCESS: Purchased server: ${serverName} with ${formatRam(ns, maxGameRam)} RAM for ${formatMoney(ns, maxAffordableCost)}`, verbose);

            if (loop) {
                log(ns, `INFO: Checking again in ${sleepTime / 1000} seconds...`, verbose)
                await ns.sleep(sleepTime);
            }

            continue;
        }
        
        // Calculate if we should purchase a server
        if (money < maxAffordableCost) {
            log(ns, `Not enough money to purchase a server. Need ${formatMoney(ns, maxAffordableCost)} for ${formatRam(ns, maxAffordableRam)} RAM.`, verbose);

            if (loop) {
                log(ns, `INFO: Checking again in ${sleepTime / 1000} seconds...`, verbose)
                await ns.sleep(sleepTime);
            }

            continue;
        }

        // Find the next available server number
        let nextServerNum = 0;
        while (existingServers.includes(serverPrefix + nextServerNum)) {
            nextServerNum++;
        }
        
        const serverName = serverPrefix + nextServerNum;
        ns.purchaseServer(serverName, maxAffordableRam);
        log(ns, `Purchased server: ${serverName} with ${formatRam(ns, maxAffordableRam)} RAM for ${formatMoney(ns, maxAffordableCost)}`, true);
        
        // Sleep before next iteration
        if (loop) {
            await ns.sleep(sleepTime);
        }
    } while (loop);
}