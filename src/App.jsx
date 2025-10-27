import React, { useState } from "react";
import "./App.css";

const SCALE = 1000000n;
const MAX_ABS = 1000000000000n * SCALE;

function normalizeInput(str) {
  if (typeof str !== "string") return "";
  let s = str.replace(/\s+/g, "");
  s = s.replace(/,/g, ".");
  return s;
}

function containsExponentNotation(s) {
  return /[eE]/.test(s);
}

function parseToMicro(sRaw) {
  const s = normalizeInput(sRaw);
  if (s.length === 0) return { ok: false, error: "Пустая строка" };
  if (containsExponentNotation(s)) return { ok: false, error: "Экспоненциальная нотация не поддерживается" };
  let sign = 1n;
  let t = s;
  if (t[0] === "+") t = t.slice(1);
  else if (t[0] === "-") { sign = -1n; t = t.slice(1); }
  if (t.length === 0) return { ok: false, error: "Не указано число" };
  const parts = t.split(".");
  if (parts.length > 2) return { ok: false, error: "Неверный формат числа" };
  const intPart = parts[0] === "" ? "0" : parts[0];
  let fracPart = parts[1] || "";
  if (!/^\d+$/.test(intPart)) return { ok: false, error: "Неверная целая часть" };
  if (fracPart && !/^\d+$/.test(fracPart)) return { ok: false, error: "Неверная дробная часть" };
  if (fracPart.length > 6) {
    const seventh = parseInt(fracPart[6], 10);
    let trimmed = fracPart.slice(0, 6);
    if (seventh >= 5) {
      let asNum = BigInt(trimmed) + 1n;
      if (asNum >= 1000000n) {
        const newInt = BigInt(intPart) + 1n;
        return { ok: true, value: sign * (newInt * SCALE) };
      }
      trimmed = asNum.toString().padStart(6, "0");
    }
    fracPart = trimmed;
  } else {
    fracPart = fracPart.padEnd(6, "0");
  }
  const intBig = BigInt(intPart || "0");
  const fracBig = BigInt(fracPart || "0");
  const value = sign * (intBig * SCALE + fracBig);
  return { ok: true, value };
}

function formatMicro(valueBigInt) {
  const sign = valueBigInt < 0n ? "-" : "";
  const abs = valueBigInt < 0n ? -valueBigInt : valueBigInt;
  const intPart = abs / SCALE;
  const fracPart = abs % SCALE;
  const intStr = intPart.toString();
  const fracStr = fracPart.toString().padStart(6, "0");
  return `${sign}${intStr}.${fracStr}`;
}

export default function FinancialCalculator() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [op, setOp] = useState("+");
  const [result, setResult] = useState(null);

  const compute = () => {
    const pa = parseToMicro(a);
    if (!pa.ok) { setResult({ ok: false, text: `Ошибка в первом числе: ${pa.error}` }); return; }
    const pb = parseToMicro(b);
    if (!pb.ok) { setResult({ ok: false, text: `Ошибка во втором числе: ${pb.error}` }); return; }
    let res = op === "+" ? pa.value + pb.value : pa.value - pb.value;
    if (res > MAX_ABS || res < -MAX_ABS) { setResult({ ok: false, text: "Ошибка: переполнение диапазона" }); return; }
    const text = formatMicro(res);
    setResult({ ok: true, text, raw: res });
  };

  const copyResult = async () => {
    if (!result || !result.ok) return;
    try { await navigator.clipboard.writeText(result.text); } catch (error) { alert(`Не удалось скопировать в буфер обмена: ${error}`); }
  };

  const clearResult = () => setResult(null);

  return (
    <div className="app-container">
      <div className="calculator">
        <h2 className="title">Финансовый калькулятор</h2>
        <p className="subtitle">Вводите числа с точкой или запятой как разделитель дробной части.</p>

        <div className="student-info">Ставер Алексей Андреевич, 4 курс, 4 группа, 2025</div>

        <div className="inputs-grid">
          <div className="input-block">
            <label>Число A</label>
            <input value={a} onChange={(e)=>{setA(e.target.value); clearResult();}} placeholder="пример: 1234567890,123456" />
          </div>
          <div className="input-block">
            <label>Число B</label>
            <input value={b} onChange={(e)=>{setB(e.target.value); clearResult();}} placeholder="пример: -987654321,654321" />
          </div>
        </div>

        <div className="operations">
          <label><input type="radio" name="op" checked={op === '+'} onChange={()=>{setOp('+'); clearResult();}} /> Сложение</label>
          <label><input type="radio" name="op" checked={op === '-'} onChange={()=>{setOp('-'); clearResult();}} /> Вычитание</label>
          <button onClick={compute}>Вычислить</button>
        </div>

        <div className="result">
          <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>Результат:</div>
          {result === null ? (
            <div className="no-result">Нет вычислений</div>
          ) : result.ok ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <pre>{result.text}</pre>
              <button onClick={copyResult}>Скопировать</button>
            </div>
          ) : (
            <div className="error">{result.text}</div>
          )}
        </div>

        <details className="details">
          <summary>Технические детали</summary>
          <div>- операции в микроединицах (scale = 1e6) с BigInt</div>
        </details>
      </div>
    </div>
  );
}
