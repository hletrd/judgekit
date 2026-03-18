"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CAPABILITY_GROUPS, type Capability } from "@/lib/capabilities/types";

interface CapabilityMatrixProps {
  selected: string[];
  onChange: (capabilities: string[]) => void;
  disabled?: boolean;
}

export default function CapabilityMatrix({ selected, onChange, disabled }: CapabilityMatrixProps) {
  const t = useTranslations("capabilities");
  const tRoles = useTranslations("admin.roles");
  const selectedSet = new Set(selected);

  function toggleCapability(cap: string) {
    if (disabled) return;
    const next = new Set(selectedSet);
    if (next.has(cap)) {
      next.delete(cap);
    } else {
      next.add(cap);
    }
    onChange([...next]);
  }

  function selectAllInGroup(caps: readonly Capability[]) {
    if (disabled) return;
    const next = new Set(selectedSet);
    for (const cap of caps) {
      next.add(cap);
    }
    onChange([...next]);
  }

  function deselectAllInGroup(caps: readonly Capability[]) {
    if (disabled) return;
    const next = new Set(selectedSet);
    for (const cap of caps) {
      next.delete(cap);
    }
    onChange([...next]);
  }

  return (
    <div className="space-y-4">
      {Object.entries(CAPABILITY_GROUPS).map(([groupKey, group]) => {
        const allSelected = group.capabilities.every((c) => selectedSet.has(c));
        const someSelected = group.capabilities.some((c) => selectedSet.has(c));

        return (
          <div key={groupKey} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{t(`groups.${groupKey}`)}</h4>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => selectAllInGroup(group.capabilities)}
                  disabled={disabled || allSelected}
                >
                  {tRoles("selectAll")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => deselectAllInGroup(group.capabilities)}
                  disabled={disabled || !someSelected}
                >
                  {tRoles("deselectAll")}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {group.capabilities.map((cap) => (
                <div key={cap} className="flex items-center gap-2">
                  <Checkbox
                    id={`cap-${cap}`}
                    checked={selectedSet.has(cap)}
                    onCheckedChange={() => toggleCapability(cap)}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`cap-${cap}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {t(`items.${cap}`)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
