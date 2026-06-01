/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DiscountCodeData } from "../types";

export function getChannelFromCode(code: string): string {
  const upper = code.toUpperCase();
  if (upper.startsWith("EV")) return "Events/Offline";
  if (upper.startsWith("BD")) return "Partner/Affiliate";
  if (upper.startsWith("INF") || upper.startsWith("AFL")) return "Influencer";
  if (upper.startsWith("GA")) return "Paid Search";
  if (upper.startsWith("FB")) return "Paid Social";
  return "Partner/Affiliate";
}

const RAW_CSV_DATA = `discount_code,Province,total_discount_used,Sum LTV 3,Sum LTV 6,Sum LTV 12,Avg LTV 3,Avg LTV 6,Avg LTV 12,Signups,Paying cx,Conversion
BRMOCKACCOUNT,QC,-1,0,0,0,0,0,0,2,0,0
EVOTTCHRISTMASNOV22,QC,-9.5,273.2,273.2,273.2,273.2,273.2,273.2,1,1,1
EVSHIPYARDS20,ON,-9.5,20,20,20,20,20,20,1,0,0
BDMAHOGANY2025,AB,-9.5,20,20,20,20,20,20,1,0,0
EVCANFIT20,BC,-9.5,20,20,20,20,20,20,1,0,0
GA75BRAND18,BC,-23371.5,75524.3,113513,128573,471.7,709,803,1750,1160,0.66
GA5BRAND18,BC,-17139.5,207679,317563,426026,549.4,840.1,1127,1819,976,0.53
GA75BRAND19,AB,-12520.5,346348,528780,614103,407.9,622.8,723.3,988,556,0.56
BDALUMNIUBC90,BC,-9490,63168,82256,95052,426.8,555.7,642.2,163,81,0.49
GA50BRAND19,AB,-8968,104765,167332,230654,557.2,890,1226.8,221,134,0.6
BDPERKOPOLIS75,ON,-6195,15888,17681,17765,174.5,194.3,195.2,102,29,0.28
AFL80ES,BC,-3955,79047,113670,133090,385.5,554.4,649.2,219,119,0.54
GA75NBRAND18,AB,-400.25,7848.1,12370,12651,280.2,441.7,451.8,34,19,0.55
EVSTAMPEDE10,AB,-3725,26957,40544,51346,140.4,211.1,267.4,218,88,0.4
GA50NBRTE18,BC,-3422,39886,59846,75569,531.8,797.9,1007.5,87,50,0.57
GA5NBRAND18,BC,-195285.5,213747,213747,213747,373.3,408.6,408.6,610,307,0.5
FPFREEMEALS,AB,-,719322,1040261,1252387,436.4,631.2,759.9,1923,1227,0.63
FPFREEMEALS,BC,-,1399648,2053605,2499299,422.7,620.2,754.8,3791,2412,0.63
FPFREEMEALS,QC,-,148401,216197,256716,509.9,742.9,882.1,343,212,0.61
FPFREEMEALS,ON,-,119451,181078,205551,523.9,794.2,901.5,258,161,0.62
OGSALE50,BC,-,593565,642895,642895,352.4,381.7,381.7,1891,980,0.51
OGSALE50,AB,-,323629,353260,353260,369.4,403.2,403.2,1004,533,0.53
OGSALE50,ON,-,156634,166317,166317,264.1,280.4,280.4,685,260,0.37
UNIONTORONTO,ON,-82,2162.79,3038.19,3038.19,144.1,202.5,202.5,17,8,0.47
BDEVO,ON,-59.5,3425,4775.8,4775.8,856.2,1193.9,1193.9,5,3,0.6
BDPERKOPOLIS,BC,-1040,21302.2,31261.9,38870.6,367.2,538.9,670.1,61,36,0.59
EVOTTPARKDALE,ON,-1016.5,33251,53139,69533,310.7,496.6,649.8,108,66,0.61
EVEDMFOODWINE,AB,-1189.5,13307,23567,25608,218.1,386.3,419.8,72,31,0.43
AMFINISHZW,BC,-,75255.6,94034.6,97027.6,476.3,595.1,614,181,124,0.68
AMFINISHZW,ON,-,29580.7,35947.5,37587.8,410.8,499.2,522,86,56,0.65`;

function parseDefaultCSV(csvText: string): DiscountCodeData[] {
  const lines = csvText.trim().split("\n");
  const result: DiscountCodeData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",");
    if (cols.length < 11) continue;

    const discount_code = cols[0].trim();
    const province = cols[1].trim() || "ON";
    
    // safe parsing helpers to handle "-" defaults
    const parseVal = (str: string) => {
      const clean = (str || "").trim();
      if (!clean || clean === "-" || clean === "N/A" || clean === "NaN") return 0;
      return parseFloat(clean) || 0;
    };

    const total_discount_used = parseVal(cols[2]);
    const sumLtv3 = parseVal(cols[3]);
    const sumLtv6 = parseVal(cols[4]);
    const sumLtv12 = parseVal(cols[5]);
    const avgLtv3 = parseVal(cols[6]);
    const avgLtv6 = parseVal(cols[7]);
    const avgLtv12 = parseVal(cols[8]);
    const signups = parseVal(cols[9]);
    const payingCx = parseVal(cols[10]);
    
    let conversion = parseVal(cols[11]);
    if (conversion === 0 && signups > 0) {
      conversion = (payingCx / signups) * 100;
    } else if (conversion > 0 && conversion <= 1.0 && payingCx > 0) {
      conversion = conversion * 100;
    }

    const channel = getChannelFromCode(discount_code);

    result.push({
      discount_code,
      channel,
      Province: province,
      Signups: signups,
      "Paying cx": payingCx,
      Conversion: conversion,
      total_discount_used,
      "Sum LTV 3": sumLtv3,
      "Sum LTV 6": sumLtv6,
      "Sum LTV 12": sumLtv12,
      "Avg LTV 3": avgLtv3,
      "Avg LTV 6": avgLtv6,
      "Avg LTV 12": avgLtv12
    });
  }
  return result;
}

export const SAMPLE_CODES_DATA: DiscountCodeData[] = parseDefaultCSV(RAW_CSV_DATA);

export const DEFAULT_INPUT_CODES = `FPFREEMEALS
GA75BRAND18
UNIONTORONTO
BDEVO
BDPERKOPOLIS
GA5BRAND18
EVSHIPYARDS20
AMFINISHZW`;
