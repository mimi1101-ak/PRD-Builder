"use client";

import { useEffect, useState } from "react";

type Options = {
  // 처음부터 첫 문장을 다 써 둔 채로 시작할지 (입력창 안내 문구처럼)
  startFull?: boolean;
  // 첫 문장 다음부터 순서를 섞을지. 한 바퀴 돌면 다시 첫 문장으로 돌아온다
  shuffle?: boolean;
  // false 면 멈추고, 다시 true 가 되면 처음부터
  active?: boolean;
  hold?: number;
};

const TYPE_MS = 70;
const DELETE_MS = 30;
const GAP_MS = 450;

function shuffled<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 한 글자씩 쓰고, 잠깐 멈췄다가 한 글자씩 지우고, 다음 문장으로 넘어간다.
// 움직임 줄이기를 켠 사람에게는 첫 문장만 그대로 보여 준다.
export function useTypewriter(lines: string[], { startFull = false, shuffle = false, active = true, hold = 1600 }: Options = {}) {
  const [text, setText] = useState(startFull ? lines[0] : "");

  useEffect(() => {
    if (!active) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const order = () => (shuffle ? [lines[0], ...shuffled(lines.slice(1))] : lines);
    let queue = order();
    let line = 0;
    let len = startFull ? queue[0].length : 0;
    let timer: ReturnType<typeof setTimeout>;

    const type = () => {
      const full = queue[line];
      if (len < full.length) {
        len++;
        setText(full.slice(0, len));
        timer = setTimeout(type, TYPE_MS);
      } else {
        timer = setTimeout(erase, hold);
      }
    };
    const erase = () => {
      if (len > 0) {
        len--;
        setText(queue[line].slice(0, len));
        timer = setTimeout(erase, DELETE_MS);
      } else {
        line++;
        if (line >= queue.length) {
          queue = order();
          line = 0;
        }
        timer = setTimeout(type, GAP_MS);
      }
    };

    if (still) timer = setTimeout(() => setText(lines[0]), 0);
    else if (startFull)
      timer = setTimeout(() => {
        setText(lines[0]);
        timer = setTimeout(erase, hold);
      }, 0);
    else timer = setTimeout(type, 800);
    return () => clearTimeout(timer);
  }, [lines, startFull, shuffle, active, hold]);

  return text;
}
