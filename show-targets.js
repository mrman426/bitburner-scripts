import { getAllServers, getTargetServers, getRunningPrograms, calculateRequiredThreads, calculateAttackThreads } from "./utils/server.js";
import { listView, formatNumber } from "./utils/console.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return ["--loop"];
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    const loop = ns.args.includes("--loop");

    do {
        const allServers = getAllServers(ns);
        const attacks = getRunningPrograms(ns, allServers, ["attack.js", "hack.js", "grow.js", "weaken.js"]);
        const targets = getTargetServers(ns, allServers)
            .filter(server => {
                if (ns.getServerMaxRam(server) === 0) return false;
                if (!ns.hasRootAccess(server)) return false;
                if (server.startsWith('pserv-') || server === "home") return false;
                if (ns.getServerMaxMoney(server) <= 0) return false;
                return true;
            })
            .sort((a, b) => ns.getWeakenTime(a) - ns.getWeakenTime(b))
            .map(server => {
                const requiredThreads = {
                    weaken: calculateRequiredThreads(ns, server, 'weaken'),
                    grow: calculateRequiredThreads(ns, server, 'grow'),
                    hack: calculateRequiredThreads(ns, server, 'hack'),
                    growWeaken: calculateRequiredThreads(ns, server, 'growWeaken'),
                };
                const weakenTime = ns.getWeakenTime(server);
                const proThreads = calculateAttackThreads(ns, server);
                const totalRequiredThreads = requiredThreads.weaken + requiredThreads.grow + requiredThreads.hack + requiredThreads.growWeaken;
                const totalProThreads = (proThreads.hack + proThreads.weaken + proThreads.grow + proThreads.growWeaken) * Math.ceil(weakenTime / 1000);
                const attackTime = ns.getWeakenTime(server);
                const availableMoney = ns.getServerMoneyAvailable(server);
                const maxMoney = ns.getServerMaxMoney(server);
                const security = ns.getServerSecurityLevel(server);
                const minSecurity = ns.getServerMinSecurityLevel(server);
                const moneyPerAttack = maxMoney * 0.1; // 10% of max money is the target for hack
                const moneyStatus = availableMoney > maxMoney * 0.8 ? '✓' : '✗';
                const securityStatus = security < minSecurity + 4 ? '✓' : '✗';

                return {
                    Server: server,
                    Money: `${moneyStatus} $${ns.formatNumber(availableMoney)} / $${ns.formatNumber(maxMoney)}`,
                    Security: `${securityStatus} ${security.toFixed(1)} / ${minSecurity.toFixed(1)}`,
                    "Money per Attack": `$${ns.formatNumber(moneyPerAttack)}`,
                    "Threads": formatNumber(ns, totalRequiredThreads),
                    // "Threads (W+G+H=T)": `${formatNumber(ns, requiredThreads.weaken)}+${formatNumber(ns, requiredThreads.grow)}+${formatNumber(ns, requiredThreads.hack)}=${formatNumber(ns, totalRequiredThreads)}`,
                    "PThreads": formatNumber(ns, totalProThreads),
                    // "PThreads (H+W+G+W=T)": `${formatNumber(ns, proThreads.hack)}+${formatNumber(ns, proThreads.weaken)}+${formatNumber(ns, proThreads.grow)}+${formatNumber(ns, proThreads.growWeaken)}=${formatNumber(ns, totalProThreads)}`,
                    // "Time to Attack": formatDelay(ns, attackTime) + " (" + Math.round(attackTime/1000) + "s)",
                    "Attack Time": Math.round(attackTime/1000) + "s",
                    "Attacking": attacks.has(server) ? `${attacks.get(server).threads} threads` : "No",
                };
            });
        
        ns.tprint("\n=== Targets ===\n" + listView(targets));

        if (loop) {
            await ns.sleep(2000);
        }
    } while (loop);
} 