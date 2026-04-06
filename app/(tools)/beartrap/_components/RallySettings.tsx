"use client";

import { Input } from "@/app/_shared/components/Input";
import type { BearTrapConfig } from "@/app/_shared/types";

interface RallySettingsProps {
  config: BearTrapConfig;
  onConfigChange: (config: BearTrapConfig) => void;
}

export default function RallySettings({
  config,
  onConfigChange,
}: RallySettingsProps) {
  const handleChange = (updates: Partial<BearTrapConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <Input
        label="March Capacity"
        type="number"
        value={config.marchCapacity}
        onChange={(e) =>
          handleChange({ marchCapacity: parseInt(e.target.value) || 0 })
        }
        min={0}
        helper="Maximum troops you can send in own rally"
      />

      <Input
        label="Joiner Limit"
        type="number"
        value={config.joinerLimit}
        onChange={(e) =>
          handleChange({ joinerLimit: parseInt(e.target.value) || 0 })
        }
        min={0}
        helper="Alliance joiner limit (affects joining capacity)"
      />

      <Input
        label="March Count"
        type="number"
        value={config.marchCount}
        onChange={(e) =>
          handleChange({ marchCount: parseInt(e.target.value) || 1 })
        }
        min={1}
        max={20}
        helper="Number of joiner formations (marches) to create"
      />

      <Input
        label="Trap Enhancement Level"
        type="number"
        value={config.trapEnhancementLevel}
        onChange={(e) =>
          handleChange({ trapEnhancementLevel: parseInt(e.target.value) || 1 })
        }
        min={1}
        max={20}
        helper="Trap upgrade level: +5% attack per level (max 25%)"
      />

      <Input
        label="Own Rally Organized Count"
        type="number"
        value={config.ownRallyCount}
        onChange={(e) =>
          handleChange({ ownRallyCount: parseInt(e.target.value) || 1 })
        }
        min={1}
        helper="Total times you organized/led your own rally (limited to 1 per player)"
      />

      <Input
        label="Joined Rally Count"
        type="number"
        value={config.joinedRallyCount}
        onChange={(e) =>
          handleChange({ joinedRallyCount: parseInt(e.target.value) || 50 })
        }
        min={0}
        helper="Total times you joined other rallies (average 50, can be higher)"
      />
    </div>
  );
}
