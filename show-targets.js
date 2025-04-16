import { getAllServers, getRunningPrograms, calculateRequiredThreads, calculateAttackThreads } from "./utils/server.js";
import { listView, formatNumber } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    const allServers = getAllServers(ns);
    const attacks = getRunningPrograms(ns, allServers, ["attack.js", "hack.js", "grow.js", "weaken.js"]);
    const formattedData = allServers
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
                hack: calculateRequiredThreads(ns, server, 'hack')
            };
            const proThreads = calculateAttackThreads(ns, server);
            const totalRequiredThreads = requiredThreads.weaken + requiredThreads.grow + requiredThreads.hack;
            const totalProThreads = proThreads.hack + proThreads.weaken + proThreads.grow + proThreads.growWeaken;
            const attackTime = ns.getWeakenTime(server);
            const availableMoney = ns.getServerMoneyAvailable(server);
            const maxMoney = ns.getServerMaxMoney(server);
            const security = ns.getServerSecurityLevel(server);
            const minSecurity = ns.getServerMinSecurityLevel(server);
            const moneyPerAttack = maxMoney * 0.25; // 25% of max money is the target for hack

            return {
                Server: server,
                Money: `$${ns.formatNumber(availableMoney)} / $${ns.formatNumber(maxMoney)}`,
                Security: `${security.toFixed(1)} / ${minSecurity.toFixed(1)}`,
                "Money per Attack": `$${ns.formatNumber(moneyPerAttack)}`,
                "Threads": formatNumber(ns, totalRequiredThreads),
                "PThreads": formatNumber(ns, totalProThreads),
                // "Attack Threads (W+G+H=T)": `${formatNumber(ns, requiredThreads.weaken)}+${formatNumber(ns, requiredThreads.grow)}+${formatNumber(ns, requiredThreads.hack)}=${formatNumber(ns, totalRequiredThreads)}`,
                // "Pro Threads (H+W+G+W=T)": `${formatNumber(ns, proThreads.hack)}+${formatNumber(ns, proThreads.weaken)}+${formatNumber(ns, proThreads.grow)}+${formatNumber(ns, proThreads.growWeaken)}=${formatNumber(ns, totalProThreads)}`,
                // "Time to Attack": formatDelay(ns, attackTime) + " (" + Math.round(attackTime/1000) + "s)",
                "Attack Time": Math.round(attackTime/1000) + "s",
                "Attacking": attacks.has(server) ? `${attacks.get(server).threads} threads` : "No",
            };
        });
    
    ns.tprint("=== Top Servers to Attack ===\n" + listView(formattedData));
} 