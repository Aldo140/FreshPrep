import { useState, useCallback } from "react";
import { CustomerRecord } from "../types";
import { parseCustomerFile } from "../utils/customerParser";

export interface CustomerFileState {
  customerRows: CustomerRecord[];
  customerFileName: string | null;
  isLoadingCustomer: boolean;
}

export interface CustomerFileActions {
  processCustomerFile: (file: File) => Promise<void>;
  resetCustomer: () => void;
}

export function useCustomerFile(): { state: CustomerFileState; actions: CustomerFileActions } {
  const [customerRows, setCustomerRows] = useState<CustomerRecord[]>([]);
  const [customerFileName, setCustomerFileName] = useState<string | null>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);

  const processCustomerFile = useCallback(async (file: File): Promise<void> => {
    setIsLoadingCustomer(true);
    try {
      const rows = await parseCustomerFile(file);
      if (rows.length === 0) {
        alert("No valid rows found in customer file. Check the column names match the expected schema.");
        return;
      }
      setCustomerRows(rows);
      setCustomerFileName(file.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not parse customer file.";
      alert(`Error: ${msg}`);
    } finally {
      setIsLoadingCustomer(false);
    }
  }, []);

  const resetCustomer = useCallback((): void => {
    setCustomerRows([]);
    setCustomerFileName(null);
    setIsLoadingCustomer(false);
  }, []);

  return {
    state: { customerRows, customerFileName, isLoadingCustomer },
    actions: { processCustomerFile, resetCustomer },
  };
}
