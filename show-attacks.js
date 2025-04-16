import { getAllServers, getRunningPrograms } from "./utils/server.js";
import { listView, formatMoney } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    const attacks = getRunningPrograms(ns, getAllServers(ns), ["attack.js", "hack.js", "grow.js", "weaken.js"]);
    
    if (attacks.size === 0) {
        ns.tprint("No attacks currently running");
        return;
    }

    const attackData = Array.from(attacks).map(([target, info]) => {
        const serverList = Array.from(info.servers);
        const formattedServerList = serverList.length <= 4 
            ? serverList.join(", ") 
            : `${serverList.slice(0, 3).join(", ")}, +${serverList.length - 3} more`;
        const attackTime = ns.getWeakenTime(target);
    
        return {
            Target: target,
            Threads: info.threads,
            Time: Math.round(attackTime/1000) + "s",
            Servers: formattedServerList,
            Money: `${formatMoney(ns, ns.getServerMoneyAvailable(target))} / ${formatMoney(ns, ns.getServerMaxMoney(target))}`,
            Security: `${ns.getServerSecurityLevel(target).toFixed(1)} / ${ns.getServerMinSecurityLevel(target).toFixed(1)}`,
        };
    });
    
    ns.tprint("\n=== Running Attacks ===\n" + listView(attackData));
}