import { formatTime, formatRam, formatNumber } from "./utils/console"
import { getAllServers, getServerMaxRam, getServerAvailableRam } from "./utils/server"

/**
 * Command options
 */
const argsSchema = [
    ['help', false],
]

/**
 * Command auto-complete
 */
export function autocomplete(data, _) {
    data.flags(argsSchema)
    return []
}

/**
 * Entry point
 *
 * @param {NS} ns
 */
export async function main(ns) {
    // get some stuff ready
    const args = ns.flags(argsSchema)
    if (args['help']) {
        ns.tprintf(getHelp(ns))
        return
    }

    // work, sleep, repeat
    do {

        // update the hud
        updateHUD(getHudData(ns))

        await ns.sleep(1000)
    } while (!args.once)
}

/**
 * Help text
 *
 * Player boss is stuck, let's get them some help.
 *
 * @returns {string}
 */
function getHelp(ns) {
    const script = ns.getScriptName()
    return [
        'Displays data on the HUD (head up display).',
        '',
        `USAGE: run ${script}`,
        '',
        'Example:',
        `> run ${script}`,
    ].join("\n")
}

/**
 *
 * @param {NS} ns
 * @param {Object} data
 */
function getHudData(ns) {

    // get total ram on all servers

    const servers = getAllServers(ns);
    let totalRam = 0;
    let availableRam = 0;
    for (const server of servers) {
        totalRam += getServerMaxRam(ns, server);
        availableRam += getServerAvailableRam(ns, server);
    }

    return {
        'Time SLA:': `${formatTime(ns, ns.getTimeSinceLastAug() / 1000, '00:00:00')}`,
        'RAM:': `${formatRam(ns, availableRam)}/${formatRam(ns, totalRam)}`,
        //'Script Inc:': `${ns.nFormat(ns.getScriptIncome()[0], '$0.0a')}/sec`,
        'Script Exp:': `${formatNumber(ns, ns.getScriptExpGain())}/sec`,
        'Share Pwr:': `${formatNumber(ns, ns.getSharePower())}`,
        //'Attacks:': `hack=${currentHackAttacks.length}|prep=${currentPrepAttacks.length}`,
    }
}

/**
 *
 * @param {Object} update - the KEY/VALUE pair to update
 * EG: {'Money':'100','Health':'10/10'}
 * @param {Boolean} replace
 */
export function updateHUD(update, replace = false) {
    const doc = eval('document')
    const hook0 = doc.getElementById('overview-extra-hook-0')
    const hook1 = doc.getElementById('overview-extra-hook-1')
    const keys = hook0.innerText.split('\n')
    const values = hook1.innerText.split('\n')
    const hud = {}
    if (!replace) {
        for (let i = 0; i < keys.length; i++) {
            if (keys[i]) {
                hud[keys[i]] = values[i]
            }
        }
    }
    for (const [k, v] of Object.entries(update)) {
        hud[k] = v
    }
    hook0.innerText = Object.keys(hud).join('\n')
    hook1.innerText = Object.values(hud).join('\n')
}