import React, { useEffect } from "react";
import { useCallback, useRef, useState } from "react";

import Convert from "ansi-to-html";
import chalk from "chalk";

declare interface unenki {
    strip: (data: string) => string
}
// @ts-ignore
import unenkiImp from "unenki";
const unenki = unenkiImp as unenki;

import { textColors } from "./constants";

import "./index.styles.css";
import { notif, onWriteRow } from "./handlers";
import { autocomplete, osType, updateUsage } from "./data";

const convert = new Convert({
    colors: {
        0: textColors.black,
        1: textColors.red,
        2: textColors.greenBright,
        3: textColors.yellow,
        4: textColors.blue,
        5: textColors.magenta,
        6: textColors.cyan,
        7: textColors.whileBright,
        8: textColors.whileBright,
        9: textColors.blueBright,
        10: textColors.magenta,
        11: textColors.magentaBright,
        12: textColors.cyan,
        13: textColors.cyanBright,
        14: textColors.white,
        15: textColors.whileBright
    }
})
const MOVING = 7.2

type props = {
    user?: string
    device?: string
    dir?: string
    isLeftData: boolean
    os: osType
}

const Term = ({user, device, dir, isLeftData, os}: props) => {
    const [rows, setRows] = useState<string[]>([
        "  _____ ______ _____   ____ _______ ",
        " / ____|  ____|  __ \\ / __ \\__   __|",
        "| (___ | |__  | |  | | |  | | | |    ",
        " \\___ \\|  __| | |  | | |  | | | |  ",
        " ____) | |____| |__| | |__| | | |    ",
        "|_____/|______|_____/ \\____/  |_|",
 
        "┌──────────────────────────────────┐",
        "│ Welcome to SEDOT terminal window │",
        "│       Type \"help\" for help       │",
        "└──────────────────────────────────┘"
    ])

    const startData = `${chalk.blue(`[${user || "root"}@${device || "root"}`)} ${dir || "~"}${chalk.blue("]$")} `;

    //service info
    const [entryOnWriteOnce, setEntryOnWriteOnce] = useState<boolean>(false);

    //cursor
    const cursorRef = useRef<HTMLDivElement | null>(null);

    //text input
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [text, setText] = useState<string>("");

    //history
    const [history, setHistory] = useState<string[]>([""]);
    const [historyCursor, setHistoryCursor] = useState<number>(0)

    //autocomplete
    const [compl, setCompl] = useState<string[]>([]);
    const [complCursor, setComplCursor] = useState<number>(0);

    const onWriteHandler = useCallback(() => {
        onWriteRow((row) => {
            setRows((r) => [...r, row])
        })
    }, [])

    useEffect(() => {
        if (!entryOnWriteOnce) {
            onWriteHandler()
            setEntryOnWriteOnce(true)
        }
    }, [])

    //event on terminal focus
    const onFocus = useCallback(() => {
        if (inputRef.current != null) {
            inputRef.current.focus();
            inputRef.current.click();
        }
    }, [inputRef])

    //moves to the next prediction variant
    const autocomMove = useCallback((type: "left" | "right") => {
        if (type == "left") {
            const c = complCursor -1
            if (c >= 0) {
                setComplCursor(c)
            }
        } else {
            const c = complCursor +1;
            if (c < compl.length) {
                setComplCursor(c)
            }
        }
    }, [complCursor, compl])

    const onHistory = useCallback((type: "up" | "down") => {
        if (inputRef.current == null) {
            return;
        }

        let curr = historyCursor;
        
        if (type == "up") {
            if (historyCursor < history.length - 1) {
                curr += 1;
            }
        } else {
            if (historyCursor > 0) {
                curr -= 1;
            }
        }

        setHistoryCursor(curr)

        inputRef.current.value = history[curr];
        setText(history[curr]);
    }, [history, historyCursor, inputRef])

    //event on move cursor pointer
    const onCursor = useCallback((type: "left" | "right") => {
        if (compl.length) {
            return autocomMove(type);
        }
        if (cursorRef.current != null) {
            let position: number = Number(cursorRef.current.style.marginLeft.split("px")[0]);
            const t = unenki.strip(text);

            if (type == "left") {
                const temp = position - 7
                position = temp / - MOVING > t.length ? position : position - MOVING;
            } else {
                position = position + MOVING > 0 ? 0 : position + MOVING;
            }

            cursorRef.current.style.marginLeft = `${position}px`;
            return;
        }
    }, [cursorRef, text, compl, autocomMove])

    //event on enter is press
    const onPressEnter = useCallback(() => {
        if (inputRef.current != null && cursorRef.current != null) {
            notif("wesh_exec", unenki.strip(text))
            let pushData: string = ""

            if (isLeftData) {
                pushData = startData
            }

            pushData += text;
            
            const newRows: string[] = [...rows, pushData];
            setRows(newRows);
            setHistory((h) => [...h, text])
            updateUsage(os, unenki.strip(text))
            setText("")
            setCompl([])
            cursorRef.current.style.marginLeft = "0px";
            inputRef.current.value = "";
        }
    }, [text, rows, notif, isLeftData, startData])

    const predictNext = useCallback(async () => {
        onFocus();

        const c = unenki.strip(text);
        if (c.length == 0) {
            return;
        }
        const comm = c.split(" ");
        const d = await autocomplete("linux", comm[comm.length -1]);
        
        if (comm[length -1] == d[0]) {
            return;
        }

        if (compl.length == 0) {
            setComplCursor(0)
            setCompl(d);
        } else {
            setCompl([])
            if (inputRef.current != null) {
                comm[comm.length -1] = d[complCursor]
                inputRef.current.value = comm.join(" ")
                updateText(inputRef.current.value)
            }
        }
    }, [text, compl, inputRef, complCursor])

    const onEscAutocom = useCallback(() => {
        setCompl([])
    }, [])

    const specialHandler = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
            case "Escape":
                onEscAutocom()
                break;
            case "Tab":
                predictNext();
                e.preventDefault();
                e.stopPropagation();
                break;
            case "Enter":
                onPressEnter()
                return;
            case "ArrowLeft":
                onCursor("left")
                return;
            case "ArrowRight":
                onCursor("right")
                return;
            case "ArrowDown":
                onHistory("down")
                break;
            case "ArrowUp":
                onHistory("up")
                break;
            default:
                break;
        }
    }, [onCursor, predictNext, onHistory])

    const updateText = useCallback((value: string) => {
        if (compl.length) {
            setCompl([])
            setComplCursor(0)
        }

        const color = value.split(" ")
        if (color.length >= 1) {
            color[0] = chalk.red(color[0])
        }
        if (color.length >= 2) {
            color[1] = chalk.green(color[1])
        }
        setText(color.join(" "))
    }, [compl])

    const t = unenki.strip(text).split(" ");

    return (
        <div onClick={onFocus} className="web-sh-term">
            <div className="web-sh-term-inner">
                {rows.map((entry, key) => {
                    return (
                        <section key={key} className="wsht-row">
                            <span dangerouslySetInnerHTML={{__html: convert.toHtml(entry)}}></span>
                        </section>
                    )
                })}
                <section className="wsht-row">
                    <div className="wsht-input-row">
                        <span>
                            {isLeftData ? (
                                <div className="nowr" dangerouslySetInnerHTML={{__html: convert.toHtml(startData)}}/>
                            ) : (<></>)}
                            <div
                                className="nowr"
                                dangerouslySetInnerHTML={{__html: convert.toHtml(text)}}
                            />
                            <span className="wesh-comp-hil">{compl.length ? compl[complCursor].slice(t[t.length-1].length) : ""}</span>
                        </span>
                        <div
                            ref={cursorRef}
                            className="wsht-cursor"
                            style={{margin: 0}}
                        />
                    </div>
                    <div className="wesh-auto">
                        {compl.map((entry, i) => (
                            <span
                                key={i}
                            >{entry}</span>
                        ))}
                    </div>
                    <input
                        ref={inputRef}
                        style={{opacity: "0", height: 0, padding: 0, margin: 0, border: "none"}}
                        onKeyDown={(e) => {
                            specialHandler(e)
                        }}
                        onChange={(e) => {
                            updateText(e.currentTarget.value)
                        }}
                    />
                </section>
            </div>
        </div>
    )
}

export default Term;