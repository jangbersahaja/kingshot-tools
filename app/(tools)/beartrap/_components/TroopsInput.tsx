"use client";

import { TROOPS } from "@/app/_shared/data/troops";
import type { BearTrapConfig, TroopTier, TroopType } from "@/app/_shared/types";

interface TroopsInputProps {
  config: BearTrapConfig;
  onConfigChange: (config: BearTrapConfig) => void;
}

const TROOP_TYPES: TroopType[] = ["infantry", "cavalry", "archer"];
const TROOP_TIERS: TroopTier[] = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

const TYPE_META: Record<TroopType, { icon: string; label: string; color: string; inputBorder: string; inputFocus: string }> = {
  infantry: { icon: "⚔️", label: "Infantry", color: "text-blue-400",   inputBorder: "border-blue-500/30",  inputFocus: "focus:border-blue-400" },
  cavalry:  { icon: "🐴", label: "Cavalry",  color: "text-green-400",  inputBorder: "border-green-500/30", inputFocus: "focus:border-green-400" },
  archer:   { icon: "🏹", label: "Archer",   color: "text-orange-400", inputBorder: "border-orange-500/30",inputFocus: "focus:border-orange-400" },
};

export default function TroopsInput({ config, onConfigChange }: TroopsInputProps) {
  /** Get count for a specific type+tier, 0 if not in inventory */
  const getCount = (type: TroopType, tier: TroopTier): number =>
    config.inventory.items.find((i) => i.type === type && i.tier === tier)?.count ?? 0;

  /** Update or remove a cell value */
  const setCount = (type: TroopType, tier: TroopTier, raw: string) => {
    const value = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    const count = isNaN(value) ? 0 : Math.max(0, value);
    const existing = config.inventory.items.findIndex(
      (i) => i.type === type && i.tier === tier,
    );
    let items = [...config.inventory.items];
    if (count === 0) {
      // Remove row if zeroed out
      if (existing !== -1) items.splice(existing, 1);
    } else if (existing !== -1) {
      items[existing] = { ...items[existing], count };
    } else {
      items.push({ id: `${type}-t${tier}-${Date.now()}`, type, tier, count });
    }
    onConfigChange({ ...config, inventory: { ...config.inventory, items } });
  };

  const getTotalByType = (type: TroopType) =>
    config.inventory.items
      .filter((i) => i.type === type)
      .reduce((s, i) => s + i.count, 0);

  const getTotalTroops = () =>
    config.inventory.items.reduce((s, i) => s + i.count, 0);

  const getTotalPower = () =>
    config.inventory.items.reduce((sum, item) => {
      const tgSuffix =
        config.inventory.trueGold[item.type] > 0
          ? `_tg${config.inventory.trueGold[item.type]}`
          : "";
      const troopData = TROOPS.find(
        (t) => t.type === item.type && t.id === `${item.type}_t${item.tier}${tgSuffix}`,
      );
      return sum + (troopData?.power ?? 0) * item.count;
    }, 0);

  return (
    <div className="space-y-4">
      {/* Grid table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-separate border-spacing-y-0.5">
          <thead>
            <tr>
              {/* Tier column header */}
              <th className="w-8 text-left pb-2 text-gray-500 font-medium">Tier</th>
              {TROOP_TYPES.map((type) => {
                const { icon, label, color } = TYPE_META[type];
                return (
                  <th key={type} className="pb-2 px-1">
                    <div className={`flex flex-col items-center gap-0.5 ${color}`}>
                      <span className="text-base leading-none">{icon}</span>
                      <span className="font-semibold">{label}</span>
                    </div>
                    {/* True Gold inline under header */}
                    <div className="mt-1.5 flex items-center justify-center gap-1">
                      <span className="text-gray-500 text-[10px]">TG</span>
                      <select
                        value={config.inventory.trueGold[type]}
                        onChange={(e) =>
                          onConfigChange({
                            ...config,
                            inventory: {
                              ...config.inventory,
                              trueGold: {
                                ...config.inventory.trueGold,
                                [type]: parseInt(e.target.value),
                              },
                            },
                          })
                        }
                        className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[10px] text-white w-10"
                      >
                        <option value="0" className="bg-zinc-900">0</option>
                        <option value="1" className="bg-zinc-900">1</option>
                        <option value="2" className="bg-zinc-900">2</option>
                        <option value="3" className="bg-zinc-900">3</option>
                      </select>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {TROOP_TIERS.map((tier) => {
              const hasAny = TROOP_TYPES.some((t) => getCount(t, tier) > 0);
              return (
                <tr
                  key={tier}
                  className={hasAny ? "bg-white/4" : "opacity-60 hover:opacity-100"}
                >
                  <td className="rounded-l pl-1.5 pr-1 py-1 text-gray-400 font-bold w-8">
                    T{tier}
                  </td>
                  {TROOP_TYPES.map((type) => {
                    const { inputBorder, inputFocus, color } = TYPE_META[type];
                    const count = getCount(type, tier);
                    return (
                      <td key={type} className="px-1 py-1 last:rounded-r">
                        <input
                          type="number"
                          min={0}
                          value={count === 0 ? "" : count}
                          placeholder="0"
                          onChange={(e) => setCount(type, tier, e.target.value)}
                          className={`
                            w-full rounded border bg-white/5 px-1.5 py-1 text-right
                            outline-none transition-colors
                            placeholder-gray-600
                            ${count > 0 ? `${color} font-semibold` : "text-gray-500"}
                            ${inputBorder} ${inputFocus}
                            focus:ring-1 focus:ring-current/20
                          `}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          {/* Column totals footer */}
          <tfoot>
            <tr className="border-t border-white/10">
              <td className="pt-2 text-[10px] text-gray-500">Total</td>
              {TROOP_TYPES.map((type) => {
                const { color } = TYPE_META[type];
                const total = getTotalByType(type);
                return (
                  <td key={type} className={`pt-2 px-1 text-right text-[10px] font-bold ${total > 0 ? color : "text-gray-600"}`}>
                    {total > 0 ? total.toLocaleString() : "—"}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Total Power */}
      <div className="border-t border-white/10 pt-3">
        <div className="bg-linear-to-r from-kingshot-primary-900/40 to-kingshot-primary-800/20 px-4 py-3 rounded-lg border border-kingshot-primary-700/30 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Troops</p>
            <p className="text-lg font-bold text-white">{getTotalTroops().toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Power</p>
            <p className="text-lg font-bold text-kingshot-primary-300">
              {getTotalPower().toLocaleString()}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 text-center">
          Match Total Power with your in-game troop power to verify
        </p>
      </div>
    </div>
  );
}
