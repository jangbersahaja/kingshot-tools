"use client";

import { Input } from "@/app/_shared/components/Input";
import { Select } from "@/app/_shared/components/Select";
import { TROOPS } from "@/app/_shared/data/troops";
import type {
  BearTrapConfig,
  TroopInventoryItem,
  TroopTier,
  TroopType,
} from "@/app/_shared/types";
import { useState } from "react";

interface TroopsInputProps {
  config: BearTrapConfig;
  onConfigChange: (config: BearTrapConfig) => void;
}

const TROOP_TYPES: TroopType[] = ["infantry", "cavalry", "archer"];
const TROOP_TIERS: TroopTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function TroopsInput({
  config,
  onConfigChange,
}: TroopsInputProps) {
  const [selectedType, setSelectedType] = useState<TroopType>("infantry");
  const [selectedTier, setSelectedTier] = useState<TroopTier>(10);
  const [selectedAmount, setSelectedAmount] = useState(0);

  const handleAddTroop = () => {
    if (selectedAmount <= 0) return;

    const newItem: TroopInventoryItem = {
      id: `${selectedType}-t${selectedTier}-${Date.now()}`,
      type: selectedType,
      tier: selectedTier,
      count: selectedAmount,
    };

    const updatedItems = [...config.inventory.items, newItem];
    onConfigChange({
      ...config,
      inventory: {
        ...config.inventory,
        items: updatedItems,
      },
    });

    setSelectedAmount(0);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = config.inventory.items.filter((_, i) => i !== index);
    onConfigChange({
      ...config,
      inventory: {
        ...config.inventory,
        items: updatedItems,
      },
    });
  };

  const handleTrueGoldChange = (type: TroopType, level: number) => {
    onConfigChange({
      ...config,
      inventory: {
        ...config.inventory,
        trueGold: {
          ...config.inventory.trueGold,
          [type]: level,
        },
      },
    });
  };

  const getTotalTroops = () => {
    return config.inventory.items.reduce((sum, item) => sum + item.count, 0);
  };

  const getTotalPower = () => {
    return config.inventory.items.reduce((sum, item) => {
      // Build the true gold suffix based on the trueGold level for this type
      const tgSuffix =
        config.inventory.trueGold[item.type] > 0
          ? `_tg${config.inventory.trueGold[item.type]}`
          : "";

      // Find the troop data with the correct true gold level
      const troopData = TROOPS.find(
        (t) =>
          t.type === item.type &&
          t.id === `${item.type}_t${item.tier}${tgSuffix}`,
      );

      return sum + (troopData?.power || 0) * item.count;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Add Troop Section */}
      <div className="border-b border-white/10 pb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">
          Add Troop
        </h3>
        <div className="space-y-3">
          <Select
            label="Troop Type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as TroopType)}
            options={TROOP_TYPES.map((type) => ({
              value: type,
              label: type.charAt(0).toUpperCase() + type.slice(1),
            }))}
          />

          <Select
            label="Troop Tier"
            value={selectedTier.toString()}
            onChange={(e) =>
              setSelectedTier(parseInt(e.target.value) as TroopTier)
            }
            options={TROOP_TIERS.map((tier) => ({
              value: tier.toString(),
              label: `T${tier}`,
            }))}
          />

          <Input
            label="Amount"
            type="number"
            value={selectedAmount}
            onChange={(e) => setSelectedAmount(parseInt(e.target.value) || 0)}
            min={0}
          />

          <button
            onClick={handleAddTroop}
            disabled={selectedAmount <= 0}
            className="w-full rounded-lg bg-kingshot-primary-600 px-3 py-2 text-sm text-white font-medium hover:bg-kingshot-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Inventory List */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-200">
            Inventory
          </h3>
          <span className="text-xs text-gray-500">
            Total: {getTotalTroops().toLocaleString()}
          </span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {config.inventory.items.length === 0 ? (
            <p className="text-xs text-gray-500">
              No troops added yet
            </p>
          ) : (
            config.inventory.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white/5 border border-white/10 p-2 rounded text-xs"
              >
                <span className="text-gray-200 flex-1">
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)} T
                  {item.tier}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const updated = [...config.inventory.items];
                      updated[index] = {
                        ...item,
                        count: Math.max(0, item.count - 1),
                      };
                      onConfigChange({
                        ...config,
                        inventory: { ...config.inventory, items: updated },
                      });
                    }}
                    className="px-1.5 py-0.5 bg-white/10 rounded hover:bg-white/20 text-gray-200"
                  >
                    −
                  </button>
                  <span className="w-12 text-right text-white font-medium">
                    {item.count.toLocaleString()}
                  </span>
                  <button
                    onClick={() => {
                      const updated = [...config.inventory.items];
                      updated[index] = { ...item, count: item.count + 1 };
                      onConfigChange({
                        ...config,
                        inventory: { ...config.inventory, items: updated },
                      });
                    }}
                    className="px-1.5 py-0.5 bg-white/10 rounded hover:bg-white/20 text-gray-200"
                  >
                    +
                  </button>
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="px-1.5 py-0.5 text-red-600 hover:text-red-700 font-medium ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* True Gold Levels */}
      <div className="border-t border-white/10 pt-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">
          True Gold Levels
        </h3>
        <div className="space-y-2">
          {TROOP_TYPES.map((type) => (
            <div key={type} className="flex items-center justify-between">
              <label className="text-xs text-gray-400">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </label>
              <select
                value={config.inventory.trueGold[type]}
                onChange={(e) =>
                  handleTrueGoldChange(type, parseInt(e.target.value))
                }
                className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Total Power */}
      <div className="border-t border-white/10 pt-4">
        <div className="bg-linear-to-r from-kingshot-primary-900/40 to-kingshot-primary-800/20 p-4 rounded-lg border border-kingshot-primary-700/30">
          <p className="text-xs text-gray-400 mb-1">
            Total Troops Power
          </p>
          <p className="text-2xl font-bold text-kingshot-primary-300">
            {getTotalPower().toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Match this with the game to verify your inventory
          </p>
        </div>
      </div>
    </div>
  );
}
