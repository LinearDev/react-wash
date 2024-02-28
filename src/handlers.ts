type events = "wesh_exec" | "wesh_write"

export const onExec = (callback: (command: string) => void) => {
    window.addEventListener("wesh_exec", (data: any) => {
        callback(data.detail.data() as string);
    })
}

export const writeRow = (str: string) => {
    notif("wesh_write", str);
}

export const writeBatch = (str: string) => {
    const s: string[] = str.split("\n");
    s.map((entry) => {
        notif("wesh_write", entry);
    })
}

export const onWriteRow = (callback: (row: string) => void) => {
    window.addEventListener("wesh_write", (data: any) => {
        callback(data.detail.data() as string);
    })
}

export const notif = (event: events, data: string) => {
    window.dispatchEvent(new CustomEvent(event, {
        bubbles: false,
        detail: {
            data: () => data,
        }
    }))
}