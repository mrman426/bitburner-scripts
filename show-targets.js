import { getAllServers, getRunningPrograms, getServerScores, calculateRequiredThreads, calculateAttackThreads } from "./utils/server.js";
import { listView, formatDelay, formatNumber } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    const allServers = getAllServers(ns);
    const attacks = getRunningPrograms(ns, allServers, ["attack.js", "hack.js", "grow.js", "weaken.js"]);
    const formattedData = getServerScores(ns, allServers)
        .sort((a, b) => b.score - a.score)
        .map(s => {
            const server = s.server;
            const requiredThreads = {
                weaken: calculateRequiredThreads(ns, server, 'weaken'),
                grow: calculateRequiredThreads(ns, server, 'grow'),
                hack: calculateRequiredThreads(ns, server, 'hack')
            };
            const proThreads = calculateAttackThreads(ns, server);
            const totalRequiredThreads = requiredThreads.weaken + requiredThreads.grow + requiredThreads.hack;
            const totalProThreads = proThreads.hack + proThreads.weaken + proThreads.grow + proThreads.growWeaken;
            const attackTime = ns.getWeakenTime(server);

            return {
                Server: s.server,
                Score: s.score.toFixed(2),
                Money: `$${ns.formatNumber(s.availableMoney)} / $${ns.formatNumber(s.maxMoney)}`,
                Security: `${s.security.toFixed(1)} / ${s.minSecurity.toFixed(1)}`,
                "Money per Attack": `$${ns.formatNumber(s.moneyPerAttack)}`,
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