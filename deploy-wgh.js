import { getAllServers, getDeployableServers, getAvailableRam, hackServer, isServerHackable, getServerScore } from "./utils/server-utils.js";
import { calculateRequiredThreads, getRunningAttacks, waitForAttacks } from "./utils/attack-utils.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return args.length === 0 ? ["--all-servers", "--purchased-only", "--targets"] : data.servers;
}

class ServerAttackManager {
    constructor(ns) {
        this.ns = ns;
        this.lastHackTime = 0;  // Track when we last tried to gain root access
        this.scriptRams = {
            weaken: ns.getScriptRam("weaken.js"),
            grow: ns.getScriptRam("grow.js"),
            hack: ns.getScriptRam("hack.js")
        };
    }

    findBestTarget(servers) {
        const ns = this.ns;
        ns.tprint(`\nSearching through ${servers.length} total servers...`);
        const hackableServers = servers.filter(s => isServerHackable(ns, s, servers));
        ns.tprint(`Found ${hackableServers.length} hackable servers`);
        
        if (hackableServers.length === 0) {
            ns.tprint("No hackable servers found!");
            return null;
        }

        const serverScores = hackableServers.map(server => {
            const score = getServerScore(ns, server, this.scriptRams);
            // Format numbers safely with checks for NaN
            const maxMoney = ns.getServerMaxMoney(server);
            const hackTime = ns.getHackTime(server);
            ns.tprint(`Server ${server}: [Max Money: $${maxMoney ? ns.formatNumber(maxMoney) : '0'}] [Hack Time: ${hackTime ? (hackTime/1000).toFixed(1) : '0'}s] [Score: ${score ? score.toFixed(2) : '0'}]`);
            return { server, score };
        });
        
        // Sort by score and get the best
        serverScores.sort((a, b) => b.score - a.score);
        const bestServer = serverScores[0]?.server || null;
        ns.tprint(`INFO: Best target selected: ${bestServer || 'none'}`);
        return bestServer;
    }

    async deployAttack(targetServer) {
        const ns = this.ns;
        const deployableServers = getDeployableServers(ns, targetServer, useAllServers, usePurchasedOnly);
        const threads = {
            weaken: calculateRequiredThreads(ns, targetServer, 'weaken'),
            grow: calculateRequiredThreads(ns, targetServer, 'grow'),
            hack: calculateRequiredThreads(ns, targetServer, 'hack')
        };

        const weakenTime = ns.getWeakenTime(targetServer);
        const growTime = ns.getGrowTime(targetServer);
        const hackSleepTime = Math.max(weakenTime, growTime) + 2000;

        let totalDeployed = 0;
        const attackServers = deployableServers.filter(s => s !== targetServer);

        // Deploy hack threads first
        if (threads.hack > 0) {
            const hackServer = attackServers.find(server => 
                getAvailableRam(ns, server) >= threads.hack * this.scriptRams.hack);
            if (hackServer) {
                totalDeployed += await this.deployScript(hackServer, "hack.js", threads.hack, targetServer, hackSleepTime);
            }
        }

        // Deploy weaken and grow across remaining servers
        for (const server of attackServers) {
            if (threads.weaken <= 0 && threads.grow <= 0) break;

            const availableRam = getAvailableRam(ns, server);
            const weakenThreads = Math.min(threads.weaken, Math.floor(availableRam / this.scriptRams.weaken));
            const growThreads = Math.min(threads.grow, 
                Math.floor((availableRam - (weakenThreads * this.scriptRams.weaken)) / this.scriptRams.grow));

            totalDeployed += await this.deployScript(server, "weaken.js", weakenThreads, targetServer);
            totalDeployed += await this.deployScript(server, "grow.js", growThreads, targetServer);
            
            threads.weaken -= weakenThreads;
            threads.grow -= growThreads;
        }

        return totalDeployed;
    }

    async deployScript(server, scriptName, threads, target, sleepTime = 0) {
        if (threads <= 0) return 0;
        await this.ns.scp(scriptName, server);
        const pid = this.ns.exec(scriptName, server, threads, target, sleepTime);
        return pid !== 0 ? threads : 0;
    }
}

/** @param {NS} ns */
export async function main(ns) {
    const useAllServers = ns.args.includes("--all-servers");
    const usePurchasedOnly = ns.args.includes("--purchased-only");
    const targetArg = ns.args.find(arg => arg.startsWith("--targets="));
    const targetServers = targetArg ? targetArg.split("=")[1].split(",").map(s => s.trim()) : null;

    const manager = new ServerAttackManager(ns);

    while (true) {
        const allServers = targetServers || getAllServers(ns);

        // Hack new servers periodically (every 5 minutes)
        if (Date.now() - manager.lastHackTime > 300000) {
            for (let i = 0; i < allServers.length; i += 5) {
                await Promise.all(allServers.slice(i, i + 5).map(server => hackServer(ns, server)));
                await ns.sleep(100);
            }
            manager.lastHackTime = Date.now();
        }

        const targetServer = manager.findBestTarget(allServers);
        if (!targetServer) {
            await ns.sleep(5000);
            continue;
        }

        await manager.deployAttack(targetServer);

        await ns.sleep(10000);
    }
}