import { openDB } from 'idb';

import linux_comm from "./linux_comm.json";
import win_comm from "./win_comm.json";
import macos_comm from "./macos_comm.json";

export type osType = "linux" | "windows" | "macOS";

const options = {
    keyPath: 'command',
    autoIncrement: false,
}

//commands db
export const DB = openDB('wesh-store', 1, {
    upgrade(db) {
      const winStore = db.createObjectStore('windows', options);
      const linuxStore = db.createObjectStore('linux', options);
      const macStore = db.createObjectStore('macos', options);

      winStore.createIndex("command", "command");
      linuxStore.createIndex("command", "command");
      macStore.createIndex("command", "command");
    },
});

// updates command usage
export const updateUsage = async (os: osType, command: string): Promise<void> => {
    const t = command.split(" ");
    const instance = await DB;

    const count = t.length >= 2 ? 2 : t.length;

    for (let i = 0; i < count; i++) {
        if (t[i].length <= 1 && /[^a-zA-Z]/.test(t[i])) {
            return;
        }

        const old = await instance.get(os, t[i])

        if (old == undefined) {
            await instance.add(os, {
                command: t[i],
                amount: 1
            })
        } else {
            await instance.put(os, {
                command: t[i],
                amount: old.amount +1
            })
        }
    }
}

export const removeCommand = async (os: osType, command: string) => {
    const t = command.split(" ");
    const instance = await DB;

    for (let i = 0; i < 2; i++) {
        if (t[i].length <= 1 && /[^a-zA-Z]/.test(t[i])) {
            return;
        }

        const old = await instance.get(os, t[i])

        if (old != undefined) {
            if (old.amount == 1) {
                await instance.delete(os, t[i])
            } else {
                await instance.put(os, {
                    command: t[i],
                    amount: old.amount -1
                })
            }
        }
    }
}

//mixes data about default commands from json with usage data keys
const mixer = async (defaultStore: string[], os: osType) => {
    let comb: Record<string, number> = {};

    defaultStore.forEach(entry => {
        comb[entry] = 0;
    })

    const instance = await DB;
    const history: any[] = await instance.getAllFromIndex(os, "command");

    history.forEach((entry) => {
        comb[entry.command] = entry.amount;
    })

    return comb;
}

//sorting and analytic algorithm 
const predictNextChar = async (os: osType , initialStr: string, commands: string[]): Promise<string[]> => {
    let all: string[] = [];
    
    const combination = await mixer(commands, os)
    
    Object.keys(combination).forEach(command => {
        if (command.includes(initialStr)) {
            all.push(command)
        }
    });

    let pre: any[] = [];
    all.map((entry) => {
        if (entry.indexOf(initialStr) == 0) {
            pre.push({
                "command": entry,
                "amount": combination[entry]
            })
        }
    })

    const sort = pre.sort((a, b) => {return b.amount - a.amount});
    
    return sort.map(s => s.command);
}

//if platform is linux
const linuxComp = async (comm: string) => {
    return await predictNextChar("linux", comm, linux_comm);
}

//if platform is windows
const winComp = async (comm: string) => {
    return await predictNextChar("windows", comm, win_comm);
}

//if platform is macos
const macComp = async (comm: string) => {
    return await predictNextChar("macOS", comm, macos_comm);
}

//entry point for autocomplete
export const autocomplete = async (os: osType, start: string) => {
    switch (os) {
        case "linux":
            return await linuxComp(start)
        case "windows":
            return await winComp(start)
        case "macOS":
            return await macComp(start)
    }
}