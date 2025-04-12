import { getAllServers, getDeployableServers, getAvailableRam, hackServer } from "./utils/server-utils.js";
import { calculateRequiredThreads, getRunningAttacks, waitForAttacks } from "./utils/attack-utils.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
	if (args.length === 0) {
		return ["--all-servers", "--purchased-only"];
	}
	return data.servers;
}

/** @param {NS} ns */
export async function main(ns) {
	// Parse command line arguments
	const useAllServers = ns.args.includes("--all-servers");
	const usePurchasedOnly = ns.args.includes("--purchased-only");
	let targetServer = null;
	
	// Track attacked servers and their cooldown times
	const attackedServers = new Map(); // server -> last attack time

	// Function to check if a server is ready to be attacked again
	function isServerReady(server) {
		if (!attackedServers.has(server)) return true;
		
		const lastAttackTime = attackedServers.get(server);
		const hackTime = ns.getHackTime(server);
		const cooldownTime = hackTime * 2; // Wait at least 2 hack cycles
		
		return Date.now() - lastAttackTime > cooldownTime;
	}

	// Function to mark a server as attacked
	function markServerAttacked(server) {
		attackedServers.set(server, Date.now());
	}

	// Function to deploy to a server
	async function deployToServer(server, target, weakenThreads, growThreads, hackThreads) {
		// Skip if we don't have root access
		if (!ns.hasRootAccess(server)) {
			return 0;
		}

		const availableRam = getAvailableRam(ns, server);
		const weakenRam = ns.getScriptRam("weaken.js");
		const growRam = ns.getScriptRam("grow.js");
		const hackRam = ns.getScriptRam("hack.js");
		
		let totalThreads = 0;
		
		// Deploy weaken script if needed
		if (weakenThreads > 0) {
			const weakenMaxThreads = Math.floor(availableRam / weakenRam);
			const actualWeakenThreads = Math.min(weakenThreads, weakenMaxThreads);
			
			if (actualWeakenThreads > 0) {
				// Always copy the latest version of the script
				await ns.scp("weaken.js", server);
				
				const pid = ns.exec("weaken.js", server, actualWeakenThreads, target, false, actualWeakenThreads);
				if (pid === 0) {
					ns.tprint(`WARNING: Failed to start weaken on ${server}`);
				} else {
					totalThreads += actualWeakenThreads;
				}
			}
		}
		
		// Deploy grow script if needed
		if (growThreads > 0) {
			const growMaxThreads = Math.floor(availableRam / growRam);
			const actualGrowThreads = Math.min(growThreads, growMaxThreads);
			
			if (actualGrowThreads > 0) {
				// Always copy the latest version of the script
				await ns.scp("grow.js", server);
				
				const pid = ns.exec("grow.js", server, actualGrowThreads, target, false, actualGrowThreads);
				if (pid === 0) {
					ns.tprint(`WARNING: Failed to start grow on ${server}`);
				} else {
					totalThreads += actualGrowThreads;
				}
			}
		}
		
		// Deploy hack script if needed
		if (hackThreads > 0) {
			const hackMaxThreads = Math.floor(availableRam / hackRam);
			const actualHackThreads = Math.min(hackThreads, hackMaxThreads);
			
			if (actualHackThreads > 0) {
				// Always copy the latest version of the script
				await ns.scp("hack.js", server);
				
				const pid = ns.exec("hack.js", server, actualHackThreads, target, false, actualHackThreads);
				if (pid === 0) {
					ns.tprint(`WARNING: Failed to start hack on ${server}`);
				} else {
					totalThreads += actualHackThreads;
				}
			}
		}
		
		return totalThreads;
	}

	// Main attack loop
	while (true) {
        const allServers = getAllServers(ns);

        // Only try to hack servers every 5 minutes
		if (!attackedServers.size || Date.now() - Math.min(...attackedServers.values()) > 300000) {
			ns.tprint("\nScanning and attempting to hack new servers...");
			
			// Batch server hacking to reduce lag
			const batchSize = 5;
			for (let i = 0; i < allServers.length; i += batchSize) {
				const batch = allServers.slice(i, i + batchSize);
				await Promise.all(batch.map(server => hackServer(ns, server)));
				await ns.sleep(1000); // Small delay between batches
			}
		}

        // Get all servers and filter out those we can't hack
        const hackableServers = allServers.filter(server => {
            if (server === "home") return false;
            if (!ns.hasRootAccess(server)) return false;
            if (!isServerReady(server)) return false;
            const requiredHackingLevel = ns.getServerRequiredHackingLevel(server);
            return requiredHackingLevel <= ns.getHackingLevel();
        });

        // Find the most profitable server
        let bestScore = 0;
        
        for (const server of hackableServers) {
            const maxMoney = ns.getServerMaxMoney(server);
            const minSecurity = ns.getServerMinSecurityLevel(server);
            const currentSecurity = ns.getServerSecurityLevel(server);
            const hackTime = ns.getHackTime(server);
            const hackPercent = ns.hackAnalyze(server);
            const hackAmount = maxMoney * hackPercent;
            
            // Calculate money per second
            const moneyPerSecond = hackAmount / (hackTime / 1000); // Convert ms to seconds
            
            // Calculate score based on money per second and security
            // Higher security means longer hack times, so we penalize it
            const securityPenalty = Math.max(1, currentSecurity / minSecurity);
            const score = moneyPerSecond / securityPenalty;
            
            if (score > bestScore) {
                bestScore = score;
                targetServer = server;
            }
        }
        
		// Validate the target server
		if (!targetServer) {
			ns.tprint("No target server specified and no suitable servers found");
			await ns.sleep(5000);
			continue;
		}

		if (!ns.hasRootAccess(targetServer)) {
			ns.tprint(`ERROR: No root access on target server ${targetServer}`);
			await ns.sleep(5000);
			continue;
		}

		if (ns.getServerRequiredHackingLevel(targetServer) > ns.getHackingLevel()) {
			ns.tprint(`ERROR: Hacking level too low for target server ${targetServer}`);
			await ns.sleep(5000);
			continue;
		}

		if (!isServerReady(targetServer)) {
			ns.tprint(`Server ${targetServer} is on cooldown, trying another target`);
			await ns.sleep(5000);
			continue;
		}

		// Check if we have any RAM left to attack more servers
		const deployableServers = getDeployableServers(ns, targetServer, useAllServers, usePurchasedOnly);
		const totalAvailableRam = deployableServers.reduce((sum, server) => sum + getAvailableRam(ns, server), 0);
		const scriptRam = ns.getScriptRam("hack.js");
		
		// if (totalAvailableRam < scriptRam) {
		// 	ns.tprint("No more RAM available for attacks");
		// 	break;
		// }
		
        const maxMoney = ns.getServerMaxMoney(targetServer);
        const hackPercent = ns.hackAnalyze(targetServer);
        const hackAmount = maxMoney * hackPercent;
        
		ns.tprint(`INFO: Targeting server: ${targetServer} [Max Money: ${ns.formatNumber(ns.getServerMaxMoney(targetServer))}] [Min Security: ${ns.getServerMinSecurityLevel(targetServer)}]`);
        ns.tprint(`Max Money: ${ns.formatNumber(ns.getServerMaxMoney(targetServer))}`);
        ns.tprint(`Hack Amount: ${ns.formatNumber(hackAmount)} (${(hackPercent * 100).toFixed(2)}%)`);
		
		// Calculate and display estimated operation times
		const hackTime = ns.getHackTime(targetServer);
		const growTime = ns.getGrowTime(targetServer);
		const weakenTime = ns.getWeakenTime(targetServer);
		
		ns.tprint(`\nEstimated Operation Times:`);
		ns.tprint(`- Hack: ${ns.tFormat(hackTime)}`);
		ns.tprint(`- Grow: ${ns.tFormat(growTime)}`);
		ns.tprint(`- Weaken: ${ns.tFormat(weakenTime)}`);
		
		// Calculate required threads for each operation
		const weakenThreads = calculateRequiredThreads(ns, targetServer, 'weaken');
		const growThreads = calculateRequiredThreads(ns, targetServer, 'grow');
		const hackThreads = calculateRequiredThreads(ns, targetServer, 'hack');
		
		ns.tprint(`\nRequired Threads:`);
		ns.tprint(`- Weaken: ${weakenThreads}`);
		ns.tprint(`- Grow: ${growThreads}`);
		ns.tprint(`- Hack: ${hackThreads}`);
		
		// Deploy to all available servers
		let totalThreads = 0;
		let remainingWeakenThreads = weakenThreads;
		let remainingGrowThreads = growThreads;
		let remainingHackThreads = hackThreads;
		
		// Get servers we can use for this attack (excluding target)
		const attackServers = deployableServers.filter(server => server !== targetServer);

		ns.tprint(`\nDeploying to ${attackServers.length} servers:`);
		
		// First, find a server that can handle all hack threads
		if (hackThreads > 0) {
			const hackRam = ns.getScriptRam("hack.js");
			const requiredHackRam = hackThreads * hackRam;
			
			// Since servers are sorted by RAM, first server with enough RAM will be the most powerful
			const hackServer = attackServers.find(server => {
				const availableRam = getAvailableRam(ns, server);
				//return availableRam >= requiredHackRam;
				return availableRam >= 0;
			});
			
			if (hackServer) {
				// Deploy all hack threads to this server
				await ns.scp("hack.js", hackServer);
				const pid = ns.exec("hack.js", hackServer, hackThreads, targetServer, false, hackThreads);
				if (pid === 0) {
					ns.tprint(`WARNING: Failed to start hack on ${hackServer}`);
				} else {
					ns.tprint(`- ${hackServer}: ${hackThreads} hack threads (${ns.formatRam(hackThreads * hackRam)} used)`);
					totalThreads += hackThreads;
					remainingHackThreads = 0;
				}
			} else {
				ns.tprint(`WARNING: No server found with enough RAM for all hack threads (${ns.formatRam(requiredHackRam)} needed)`);
			}
		}
		
		// Then distribute weaken and grow threads across remaining servers
		for (const server of attackServers) {
			if (remainingWeakenThreads <= 0 && remainingGrowThreads <= 0) break;

			const availableRam = getAvailableRam(ns, server);
			const weakenRam = ns.getScriptRam("weaken.js");
			const growRam = ns.getScriptRam("grow.js");
			
			// Calculate how many weaken and grow threads we can run on this server
			const weakenThreads = Math.min(remainingWeakenThreads, Math.floor(availableRam / weakenRam));
			const growThreads = Math.min(remainingGrowThreads, Math.floor((availableRam - (weakenThreads * weakenRam)) / growRam));
			
			if (weakenThreads > 0) {
				await ns.scp("weaken.js", server);
				const pid = ns.exec("weaken.js", server, weakenThreads, targetServer, false, weakenThreads);
				if (pid === 0) {
					ns.tprint(`WARNING: Failed to start weaken on ${server}`);
				} else {
					ns.tprint(`- ${server}: ${weakenThreads} weaken threads (${ns.formatRam(weakenThreads * weakenRam)} used)`);
					totalThreads += weakenThreads;
					remainingWeakenThreads -= weakenThreads;
				}
			}
			
			if (growThreads > 0) {
				await ns.scp("grow.js", server);
				const pid = ns.exec("grow.js", server, growThreads, targetServer, false, growThreads);
				if (pid === 0) {
					ns.tprint(`WARNING: Failed to start grow on ${server}`);
				} else {
					ns.tprint(`- ${server}: ${growThreads} grow threads (${ns.formatRam(growThreads * growRam)} used)`);
					totalThreads += growThreads;
					remainingGrowThreads -= growThreads;
				}
			}
		}
		
		ns.tprint(`\nTotal deployed threads: ${totalThreads}/${weakenThreads + growThreads + hackThreads}`);
		
		if (totalThreads < weakenThreads + growThreads + hackThreads) {
			ns.tprint(`WARNING: Not enough threads (${totalThreads}/${weakenThreads + growThreads + hackThreads}) to efficiently hack ${targetServer}`);
		}

		// Mark the server as attacked
		markServerAttacked(targetServer);

		// Longer delay between targets to reduce lag
		await ns.sleep(10000); // 10 second delay
	}
} 