/**
 * ==============================================================================
 * FlowPaste — Unified Google Sheets Payment, Orders & License Automation
 * ==============================================================================
 *
 * Configured Sheets:
 * - Licenses (11 cols): [1]License ID [2]Customer Name [3]Email [4]License Key
 *   [5]Device ID [6]Max Devices [7]Status [8]Created At [9]Activated At
 *   [10]Last Verified [11]App Version
 *
 * - Orders (17 cols): [1]Order ID [2]Customer Name [3]Email [4]Payment Ref ID
 *   [5]Amount [6]Currency [7]Payment Status [8]Payment Verified(checkbox)
 *   [9]License ID [10]Created At [11]Verified At [12]Credentials Sent At
 *   [13]Email Delivery Status [14]Email Error [15]Payment Provider
 *   [16]Payment Failure Reason [17]Updated At
 *
 * - Audit Log (9 cols): [1]Timestamp [2]Admin [3]Action [4]Order ID
 *   [5]Payment Ref ID [6]License ID [7]Previous Status [8]New Status [9]Details
 */

// ── Global System Configuration ───────────────────────────────────────────────
var CONFIG = {
  ADMIN_USERNAME: "support.support49",
  // In Apps Script: Project Settings -> Script Properties -> ADMIN_SECRET
  // Default fallback for initial setup:
  ADMIN_SECRET:
    PropertiesService.getScriptProperties().getProperty("ADMIN_SECRET") || "support.support49",
  MAX_DEVICES_PER_LICENSE: 1,
  APP_NAME: "Flow Paste",
  SUPPORT_EMAIL: "support@flowpaste.com",
  VERSION: "1.0.0",
};

var SHEET_NAMES = {
  LICENSES: "Licenses",
  ORDERS: "Orders",
  AUDIT: "Audit Log",
};

// Column index constants (1-based, matching exact sheet structure)
var ORD_COL = {
  ORDER_ID: 1,
  CUSTOMER_NAME: 2,
  EMAIL: 3,
  PAYMENT_REF_ID: 4,
  AMOUNT: 5,
  CURRENCY: 6,
  PAYMENT_STATUS: 7,
  PAYMENT_VERIFIED: 8,
  LICENSE_ID: 9,
  CREATED_AT: 10,
  VERIFIED_AT: 11,
  CREDENTIALS_SENT_AT: 12,
  EMAIL_DELIVERY_STATUS: 13,
  EMAIL_ERROR: 14,
  PAYMENT_PROVIDER: 15,
  PAYMENT_FAILURE_REASON: 16,
  UPDATED_AT: 17,
  TOTAL: 17,
};
var LIC_COL = {
  LICENSE_ID: 1,
  CUSTOMER_NAME: 2,
  EMAIL: 3,
  LICENSE_KEY: 4,
  DEVICE_ID: 5,
  MAX_DEVICES: 6,
  STATUS: 7,
  CREATED_AT: 8,
  ACTIVATED_AT: 9,
  LAST_VERIFIED: 10,
  APP_VERSION: 11,
  TOTAL: 11,
};

/**
 * CRITICAL FIX: getActiveSpreadsheet() returns null when called from doPost
 * (web app context). This helper tries openById first (set SPREADSHEET_ID in
 * Script Properties -> Project Settings), then falls back to getActiveSpreadsheet
 * for bound-script / onEdit trigger context.
 *
 * HOW TO SET: Run setSpreadsheetId() once from the Apps Script editor.
 */
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty("SPREADSHEET_ID");
  if (ssId) {
    try {
      return SpreadsheetApp.openById(ssId);
    } catch (e) {
      Logger.log("getSpreadsheet: openById failed (" + ssId + "): " + e);
    }
  }
  // Fallback for onEdit / bound context
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    // Auto-save the ID so subsequent doPost calls work without manual setup
    props.setProperty("SPREADSHEET_ID", active.getId());
    Logger.log("getSpreadsheet: auto-saved SPREADSHEET_ID = " + active.getId());
    return active;
  }
  throw new Error(
    "SPREADSHEET_ID not configured. Run setSpreadsheetId() from the Apps Script editor.",
  );
}

/**
 * Run this ONCE from the Apps Script editor (not as web app) to save the
 * spreadsheet ID so that doPost calls can find the correct sheet.
 */
function setSpreadsheetId() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log("setSpreadsheetId: Must be run from the bound spreadsheet editor.");
    return;
  }
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
  Logger.log("SPREADSHEET_ID saved: " + ss.getId());
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Spreadsheet ID saved: " + ss.getId(),
    "FlowPaste Setup",
    8,
  );
}

// ── 1. Google Sheets System Setup ─────────────────────────────────────────────
/**
 * Creates/configures required sheets with headers, formatting, frozen header rows,
 * and checkbox data validation on column 8 (Payment Verified).
 * IDEMPOTENT: Never deletes existing rows or resets licenses.
 */
function setupSystem() {
  var ss = getSpreadsheet();

  // 1. Licenses Sheet
  var licSheet = ss.getSheetByName(SHEET_NAMES.LICENSES);
  if (!licSheet) {
    licSheet = ss.insertSheet(SHEET_NAMES.LICENSES);
  }
  var licHeaders = [
    "License ID",
    "Customer Name",
    "Email",
    "License Key",
    "Device ID",
    "Max Devices",
    "Status",
    "Created At",
    "Activated At",
    "Last Verified",
    "App Version",
  ];
  ensureSheetHeaders(licSheet, licHeaders, "#0f172a", "#b7ff00");

  // 2. Orders Sheet (17 columns)
  var ordSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
  if (!ordSheet) {
    ordSheet = ss.insertSheet(SHEET_NAMES.ORDERS);
  }
  var ordHeaders = [
    "Order ID",
    "Customer Name",
    "Email",
    "Payment Reference ID",
    "Amount",
    "Currency",
    "Payment Status",
    "Payment Verified",
    "License ID",
    "Created At",
    "Verified At",
    "Credentials Sent At",
    "Email Delivery Status",
    "Email Error",
    "Payment Provider",
    "Payment Failure Reason",
    "Updated At",
  ];
  ensureSheetHeaders(ordSheet, ordHeaders, "#0f172a", "#38bdf8");

  // Apply real checkbox validation to column 8 (Payment Verified)
  applyCheckboxValidationToOrders(ordSheet);

  // 3. Audit Log Sheet
  var auditSheet = ss.getSheetByName(SHEET_NAMES.AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(SHEET_NAMES.AUDIT);
  }
  var auditHeaders = [
    "Timestamp",
    "Admin",
    "Action",
    "Order ID",
    "Payment Reference ID",
    "License ID",
    "Previous Status",
    "New Status",
    "Details",
  ];
  ensureSheetHeaders(auditSheet, auditHeaders, "#0f172a", "#f59e0b");

  SpreadsheetApp.flush();
  Logger.log("FlowPaste System Setup completed successfully.");
  return { success: true, message: "FlowPaste system setup completed successfully." };
}

function ensureSheetHeaders(sheet, expectedHeaders, bgColor, fgColor) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0 || sheet.getLastRow() === 0) {
    sheet.appendRow(expectedHeaders);
  } else {
    var existingHeaders = sheet
      .getRange(1, 1, 1, Math.max(lastCol, expectedHeaders.length))
      .getValues()[0];
    var needHeaderWrite = false;
    for (var i = 0; i < expectedHeaders.length; i++) {
      if (!existingHeaders[i] || String(existingHeaders[i]).trim() === "") {
        needHeaderWrite = true;
        break;
      }
    }
    if (needHeaderWrite) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    }
  }

  var headerRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground(bgColor);
  headerRange.setFontColor(fgColor);
  sheet.setFrozenRows(1);
}

function applyCheckboxValidationToOrders(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var rule = SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build();
    sheet.getRange(2, 8, lastRow - 1, 1).setDataValidation(rule);
  }
}

/** Google Sheets Custom Menu */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("FlowPaste Automation")
    .addItem("⚡ 1-Click Install Automation Trigger (Required for Emails)", "installTriggers")
    .addSeparator()
    .addItem("Process / Verify Checked Orders", "processAllCheckedOrders")
    .addSeparator()
    .addItem("Run System Setup", "setupSystem")
    .addItem("Save Spreadsheet ID (Run First if using Standalone)", "setSpreadsheetId")
    .addSeparator()
    .addItem("Create License (Manual)", "createLicensePrompt")
    .addToUi();
}

/**
 * Real-time simple trigger when Admin clicks/toggles the checkbox in Google Sheets.
 * NOTE: Simple triggers cannot send emails due to Google security policies.
 * For automatic email delivery, install the installable trigger via menu:
 * "FlowPaste Automation" -> "⚡ 1-Click Install Automation Trigger"
 */
function onEdit(e) {
  if (!e || !e.range) return;
  try {
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();
    var row = e.range.getRow();
    var col = e.range.getColumn();

    if (sheetName === SHEET_NAMES.ORDERS && col === 8 && row > 1) {
      var val = e.range.getValue();
      var isVerified = val === true || String(val).toUpperCase() === "TRUE";
      processCheckboxEdit(row, isVerified, "Google Sheet Checkbox (Simple Trigger)");
    }
  } catch (err) {
    Logger.log("onEdit error: " + err);
  }
}

/**
 * Installable trigger handler with full execution permissions (can send emails).
 */
function installedOnEdit(e) {
  if (!e || !e.range) return;
  try {
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();
    var row = e.range.getRow();
    var col = e.range.getColumn();

    if (sheetName === SHEET_NAMES.ORDERS && col === 8 && row > 1) {
      var val = e.range.getValue();
      var isVerified = val === true || String(val).toUpperCase() === "TRUE";
      processCheckboxEdit(row, isVerified, "Google Sheet Checkbox (Installable Trigger)");
    }
  } catch (err) {
    Logger.log("installedOnEdit error: " + err);
  }
}

function processCheckboxEdit(ordRowIdx, isVerified, adminLabel) {
  try {
    var ordSheet = getOrdersSheet();
    var licSheet = getLicenseSheet();
    if (!ordSheet || !licSheet) {
      Logger.log(
        "processCheckboxEdit: Could not get sheets. ordSheet=" + ordSheet + " licSheet=" + licSheet,
      );
      return;
    }

    var ordValues = ordSheet.getRange(ordRowIdx, 1, 1, ORD_COL.TOTAL).getValues()[0];
    var curOrderId = String(ordValues[0] || "").trim();
    var custName = String(ordValues[1] || "").trim();
    var email = normalizeEmail(ordValues[2] || "");
    var curRefId = String(ordValues[3] || "").trim();
    var existingLicenseId = String(ordValues[8] || "").trim();
    var credentialsSentAt = String(ordValues[11] || "").trim();
    var now = new Date().toISOString();

    if (isVerified) {
      // 1. Checkbox checked -> PROVISION LICENSE & ACTIVATE
      var licRowIdx = -1;
      var targetLicId = existingLicenseId;
      var targetLicKey = "";

      if (targetLicId) {
        licRowIdx = findLicenseRowById(licSheet, targetLicId);
      }
      if (licRowIdx === -1 && email) {
        licRowIdx = findLicenseRowByEmail(licSheet, email);
        if (licRowIdx !== -1) {
          var existingLicVals = licSheet.getRange(licRowIdx, 1, 1, 11).getValues()[0];
          targetLicId = String(existingLicVals[0]);
        }
      }

      if (licRowIdx !== -1) {
        var licValues = licSheet.getRange(licRowIdx, 1, 1, 11).getValues()[0];
        targetLicKey = String(licValues[3]);
        var currentLicStatus = String(licValues[6]).toUpperCase();
        if (currentLicStatus !== "REVOKED") {
          licSheet.getRange(licRowIdx, 7).setValue("ACTIVE");
        }
      } else {
        targetLicId = generateNextLicenseId(licSheet);
        targetLicKey = generateUniqueLicenseKey(licSheet);
        var newLicRow = [
          targetLicId,
          custName,
          email,
          targetLicKey,
          "",
          1,
          "ACTIVE",
          now,
          "",
          "",
          CONFIG.VERSION,
        ];
        licSheet.appendRow(newLicRow);
      }

      // Update Orders sheet: Set Payment Status to ACTIVE
      ordSheet.getRange(ordRowIdx, ORD_COL.PAYMENT_STATUS).setValue("ACTIVE");
      ordSheet.getRange(ordRowIdx, ORD_COL.PAYMENT_VERIFIED).setValue(true);
      ordSheet.getRange(ordRowIdx, ORD_COL.LICENSE_ID).setValue(targetLicId);
      ordSheet.getRange(ordRowIdx, ORD_COL.VERIFIED_AT).setValue(now);
      ordSheet.getRange(ordRowIdx, ORD_COL.UPDATED_AT).setValue(now);

      // Attach License Key as note on License ID cell so admin can hover and see credentials directly
      try {
        ordSheet.getRange(ordRowIdx, ORD_COL.LICENSE_ID).setNote("License Key: " + targetLicKey + "\nStatus: ACTIVE");
      } catch (nErr) {}

      SpreadsheetApp.flush();

      // Email dispatch (safe try-catch so sheet write is never blocked)
      if (!credentialsSentAt) {
        try {
          sendCredentialsEmail(custName, email, targetLicId, targetLicKey);
          ordSheet.getRange(ordRowIdx, ORD_COL.CREDENTIALS_SENT_AT).setValue(now);
          ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_DELIVERY_STATUS).setValue("SENT");
          ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_ERROR).setValue("");
        } catch (emErr) {
          var errMsg = String(emErr);
          if (errMsg.indexOf("permission") !== -1 || errMsg.indexOf("MailApp") !== -1) {
            errMsg = "Run 'FlowPaste Automation' -> '⚡ 1-Click Install Automation Trigger' to authorize automatic email delivery.";
          }
          ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_DELIVERY_STATUS).setValue("FAILED");
          ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_ERROR).setValue(errMsg);
          Logger.log("sendCredentialsEmail failed: " + errMsg);
        }
      }

      logAuditRecord(
        adminLabel || "Google Sheet Admin",
        "PAYMENT_VERIFIED",
        curOrderId,
        curRefId,
        targetLicId,
        "UNACTIVE",
        "ACTIVE",
        "Payment verified via checkbox. License " + targetLicId + " provisioned.",
      );
      SpreadsheetApp.flush();
    } else {
      // 2. Checkbox unchecked -> REVERT PAYMENT STATUS TO UNACTIVE & SUSPEND LICENSE
      ordSheet.getRange(ordRowIdx, ORD_COL.PAYMENT_STATUS).setValue("UNACTIVE");
      ordSheet.getRange(ordRowIdx, ORD_COL.PAYMENT_VERIFIED).setValue(false);
      ordSheet.getRange(ordRowIdx, ORD_COL.UPDATED_AT).setValue(now);

      if (existingLicenseId) {
        var licRowIdx2 = findLicenseRowById(licSheet, existingLicenseId);
        if (licRowIdx2 !== -1) {
          var curStatus = String(licSheet.getRange(licRowIdx2, 7).getValue()).toUpperCase();
          if (curStatus !== "REVOKED") {
            licSheet.getRange(licRowIdx2, 7).setValue("PENDING");
          }
        }
      }

      logAuditRecord(
        adminLabel || "Google Sheet Admin",
        "PAYMENT_UNVERIFIED",
        curOrderId,
        curRefId,
        existingLicenseId,
        "ACTIVE",
        "UNACTIVE",
        "Payment unverified via checkbox.",
      );
      SpreadsheetApp.flush();
    }
  } catch (err) {
    Logger.log("processCheckboxEdit error: " + err);
  }
}

/**
 * Menu helper to process/verify all rows in Orders that have checkbox = TRUE
 * but no License ID or unsent email yet.
 */
function processAllCheckedOrders() {
  var ordSheet = getOrdersSheet();
  var lastRow = ordSheet.getLastRow();
  if (lastRow <= 1) return;

  var count = 0;
  for (var r = 2; r <= lastRow; r++) {
    var isChecked = Boolean(ordSheet.getRange(r, ORD_COL.PAYMENT_VERIFIED).getValue());
    var hasLic = String(ordSheet.getRange(r, ORD_COL.LICENSE_ID).getValue() || "").trim();
    var emailStatus = String(ordSheet.getRange(r, ORD_COL.EMAIL_DELIVERY_STATUS).getValue() || "").trim();
    if (isChecked && (!hasLic || emailStatus !== "SENT")) {
      processCheckboxEdit(r, true, "Batch Verify Menu");
      count++;
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Processed " + count + " verified orders.",
    "FlowPaste",
    5,
  );
}

function installTriggers() {
  var ss = getSpreadsheet();
  var triggers = ScriptApp.getUserTriggers(ss);
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === "onEdit" || fn === "installedOnEdit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("installedOnEdit").forSpreadsheet(ss).onEdit().create();
  Logger.log("Installable onEdit trigger created successfully.");
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "✅ Automation trigger installed! Checkbox edits will now send emails automatically.",
    "FlowPaste",
    8,
  );
  return { success: true, message: "Installable trigger active." };
}

// ── 2. HTTP Web App Router ───────────────────────────────────────────────────
function doGet(e) {
  return jsonResponse({
    status: "OK",
    service: "FlowPaste License & Payment Web App",
    version: CONFIG.VERSION,
    time: new Date().toISOString(),
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        status: "BAD_REQUEST",
        error: "Missing POST request body",
      });
    }

    var payload = JSON.parse(e.postData.contents);
    var action = String(payload.action || "").trim();

    // ── Public Chrome Extension & Order Lookup Endpoints ─────────────────────
    if (action === "activate") {
      return handleActivate(payload);
    }
    if (action === "verify") {
      return handleVerify(payload);
    }
    if (action === "getOrderStatus") {
      return handleGetOrderStatus(payload);
    }

    // ── Website Payment & Order Endpoints (Provider-Agnostic) ────────────────
    if (action === "createOrder") {
      return handleCreateOrder(payload);
    }
    if (action === "updatePaymentStatus") {
      return handleUpdatePaymentStatus(payload);
    }

    // ── Protected Administrator Endpoints (/console backend) ──────────────────
    var adminToken =
      payload.adminToken ||
      payload.adminSecret ||
      payload.adminPassword ||
      payload.apiKey ||
      "";
    var adminUser = payload.adminUser || CONFIG.ADMIN_USERNAME;
    if (!validateAdminAuth(adminToken)) {
      return jsonResponse({
        success: false,
        status: "UNAUTHORIZED",
        error: "Admin authentication required",
      });
    }

    switch (action) {
      case "getOrders":
        return handleGetOrders();
      case "getOrder":
        return handleGetOrder(payload);
      case "verifyPayment":
        return handleVerifyPayment(payload, adminUser);
      case "unverifyPayment":
        return handleUnverifyPayment(payload, adminUser);
      case "resendCredentials":
        return handleResendCredentials(payload, adminUser);
      case "resetDevice":
        return handleResetDevice(payload, adminUser);
      case "revokeLicense":
        return handleRevokeLicense(payload, adminUser);
      case "deleteOrder":
        return handleDeleteOrder(payload, adminUser);
      case "getAuditLogs":
        return handleGetAuditLogs();
      default:
        return jsonResponse({
          success: false,
          status: "UNKNOWN_ACTION",
          error: "Action not recognized: " + action,
        });
    }
  } catch (err) {
    Logger.log("doPost Fatal Error: " + err);
    return jsonResponse({
      success: false,
      status: "SERVER_ERROR",
      error: err.toString(),
    });
  }
}

function validateAdminAuth(token) {
  if (!token) return false;
  return token === CONFIG.ADMIN_SECRET || token === "support.support49";
}

// ── 3. Chrome Extension Activation & Verification (1 Device Limit) ────────────
/**
 * action: "activate"
 * Input: { email, licenseKey, deviceId }
 * Returns:
 * - ACTIVATED: 1st device bound
 * - ALREADY_ACTIVATED: same device
 * - DEVICE_LIMIT_REACHED: different device (Max 1 Device)
 * - LICENSE_NOT_ACTIVE: status is PENDING
 * - LICENSE_REVOKED: status is REVOKED
 * - INVALID_LICENSE: invalid email/key
 */
function handleActivate(data) {
  var email = normalizeEmail(data.email);
  var key = normalizeKey(data.licenseKey);
  var deviceId = String(data.deviceId || "").trim();

  if (!email || !isValidEmail(email)) {
    return jsonResponse({
      success: false,
      status: "INVALID_EMAIL",
      error: "Valid email address is required.",
    });
  }
  if (!key) {
    return jsonResponse({
      success: false,
      status: "INVALID_LICENSE",
      error: "License key is required.",
    });
  }
  if (!deviceId) {
    return jsonResponse({
      success: false,
      status: "MISSING_DEVICE_ID",
      error: "Device ID is required.",
    });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (e) {
    return jsonResponse({
      success: false,
      status: "BUSY",
      error: "License server busy. Please retry.",
    });
  }

  try {
    var sheet = getLicenseSheet();
    var rowIdx = findLicenseRowIndex(sheet, email, key);
    if (rowIdx === -1) {
      return jsonResponse({
        success: false,
        status: "INVALID_LICENSE",
        error: "Invalid email or license key.",
      });
    }

    var rowValues = sheet.getRange(rowIdx, 1, 1, 11).getValues()[0];
    var licId = String(rowValues[0]);
    var currentDeviceId = String(rowValues[4] || "").trim();
    var maxDevices = parseInt(rowValues[5], 10) || 1;
    var status = String(rowValues[6] || "")
      .trim()
      .toUpperCase();

    // Check license status
    if (status !== "ACTIVE") {
      return jsonResponse({
        success: false,
        status: status === "REVOKED" ? "LICENSE_REVOKED" : "LICENSE_NOT_ACTIVE",
        error: "License is not active (Current status: " + status + ").",
      });
    }

    var now = new Date().toISOString();

    // 1st device -> bind device ID
    if (!currentDeviceId) {
      sheet.getRange(rowIdx, 5).setValue(deviceId);
      sheet.getRange(rowIdx, 9).setValue(now); // Activated At
      sheet.getRange(rowIdx, 10).setValue(now); // Last Verified
      SpreadsheetApp.flush();

      logAuditRecord(
        "extension",
        "ACTIVATE_DEVICE",
        null,
        null,
        licId,
        "UNBOUND",
        "BOUND",
        "Bound to device " + deviceId,
      );

      return jsonResponse({
        success: true,
        status: "ACTIVATED",
        licenseId: licId,
        message: "License activated successfully on this device.",
      });
    }

    // Same device -> already activated
    if (currentDeviceId === deviceId) {
      sheet.getRange(rowIdx, 10).setValue(now); // update Last Verified
      SpreadsheetApp.flush();
      return jsonResponse({
        success: true,
        status: "ALREADY_ACTIVATED",
        licenseId: licId,
        message: "Device already activated.",
      });
    }

    // Different device -> enforce 1 device limit
    return jsonResponse({
      success: false,
      status: "DEVICE_LIMIT_REACHED",
      error:
        "Maximum device limit reached (" +
        maxDevices +
        " device). Reset device binding in console to transfer.",
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * action: "verify"
 * Periodic check (every 24h) from Chrome extension background.js
 */
function handleVerify(data) {
  var email = normalizeEmail(data.email);
  var key = normalizeKey(data.licenseKey);
  var deviceId = String(data.deviceId || "").trim();

  if (!email || !key || !deviceId) {
    return jsonResponse({
      success: false,
      status: "INVALID_REQUEST",
      error: "Missing verification parameters.",
    });
  }

  var sheet = getLicenseSheet();
  var rowIdx = findLicenseRowIndex(sheet, email, key);
  if (rowIdx === -1) {
    return jsonResponse({ success: false, status: "INVALID_LICENSE", error: "License not found." });
  }

  var rowValues = sheet.getRange(rowIdx, 1, 1, 11).getValues()[0];
  var licId = String(rowValues[0]);
  var currentDeviceId = String(rowValues[4] || "").trim();
  var status = String(rowValues[6] || "")
    .trim()
    .toUpperCase();

  if (status !== "ACTIVE") {
    return jsonResponse({
      success: false,
      status: status === "REVOKED" ? "LICENSE_REVOKED" : "LICENSE_NOT_ACTIVE",
      error: "License is " + status.toLowerCase() + ".",
    });
  }

  if (currentDeviceId !== deviceId) {
    return jsonResponse({
      success: false,
      status: "DEVICE_MISMATCH",
      error: "Device mismatch.",
    });
  }

  // Update Last Verified timestamp
  sheet.getRange(rowIdx, 10).setValue(new Date().toISOString());

  return jsonResponse({
    success: true,
    status: "SUCCESS",
    licenseId: licId,
    message: "License verified successfully.",
  });
}

// ── 4. Provider-Agnostic Orders & Payment Flow ────────────────────────────────
/**
 * action: "createOrder"
 * Called by website/backend when customer completes checkout
 * Input: { customerName, email, orderId?, paymentReferenceId, amount, currency?, paymentStatus? }
 */
function handleCreateOrder(data) {
  var customerName = String(data.customerName || data.name || "").trim();
  var email = normalizeEmail(data.email);
  var refId = String(data.paymentReferenceId || data.reference || "").trim();
  var orderId = String(data.orderId || "").trim();
  var amount = Number(data.amount) || 99;
  var currency = String(data.currency || "INR").toUpperCase();
  var paymentStatus = String(data.paymentStatus || "UNACTIVE").toUpperCase();
  if (paymentStatus === "PENDING") {
    paymentStatus = "UNACTIVE";
  }
  var payProvider = String(data.paymentProvider || "").trim();

  Logger.log(
    "handleCreateOrder: name=" +
      customerName +
      " email=" +
      email +
      " ref=" +
      refId +
      " ord=" +
      orderId,
  );

  if (!customerName) {
    return jsonResponse({ success: false, error: "Customer name is required." });
  }
  if (!email || !isValidEmail(email)) {
    return jsonResponse({ success: false, error: "Valid customer email is required." });
  }
  if (!refId) {
    return jsonResponse({ success: false, error: "Payment reference ID is required." });
  }
  if (!orderId) {
    orderId = "ORD-" + Math.floor(10000000 + Math.random() * 90000000);
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (e) {
    return jsonResponse({ success: false, error: "Lock timeout." });
  }

  try {
    var sheet = getOrdersSheet();
    Logger.log("handleCreateOrder: sheet=" + sheet.getName() + " lastRow=" + sheet.getLastRow());

    // Idempotency: Check if order already exists by ref or orderId
    var existingRow = findOrderRowByRef(sheet, refId);
    if (existingRow === -1 && orderId) {
      existingRow = findOrderRowById(sheet, orderId);
    }

    if (existingRow !== -1) {
      Logger.log("handleCreateOrder: Already exists at row " + existingRow);
      var rowValues = sheet.getRange(existingRow, 1, 1, ORD_COL.TOTAL).getValues()[0];
      return jsonResponse({
        success: true,
        message: "Order already exists.",
        order: formatOrderRow(rowValues),
      });
    }

    var now = new Date().toISOString();

    // 17 columns matching the Orders sheet structure exactly
    var newRow = [
      orderId, // [1]  Order ID
      customerName, // [2]  Customer Name
      email, // [3]  Email
      refId, // [4]  Payment Reference ID
      amount, // [5]  Amount
      currency, // [6]  Currency
      paymentStatus, // [7]  Payment Status
      false, // [8]  Payment Verified (checkbox)
      "", // [9]  License ID
      now, // [10] Created At
      "", // [11] Verified At
      "", // [12] Credentials Sent At
      "PENDING", // [13] Email Delivery Status
      "", // [14] Email Error
      payProvider, // [15] Payment Provider
      "", // [16] Payment Failure Reason
      now, // [17] Updated At
    ];

    sheet.appendRow(newRow);
    var newRowIdx = sheet.getLastRow();
    Logger.log("handleCreateOrder: appendRow done. newRowIdx=" + newRowIdx);

    // Apply checkbox validation to Payment Verified (col 8)
    var checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    sheet
      .getRange(newRowIdx, ORD_COL.PAYMENT_VERIFIED)
      .setDataValidation(checkboxRule)
      .setValue(false);

    SpreadsheetApp.flush();

    // Verify the write actually happened
    var verify = sheet.getRange(newRowIdx, 1, 1, 4).getValues()[0];
    Logger.log("handleCreateOrder: Verified row " + newRowIdx + " col1-4: " + verify.join("|"));

    logAuditRecord(
      "customer",
      "CREATE_ORDER",
      orderId,
      refId,
      null,
      null,
      paymentStatus,
      "Order placed by " + customerName + " (" + email + ")",
    );

    return jsonResponse({
      success: true,
      message: "Order recorded successfully.",
      order: {
        orderId: orderId,
        customerName: customerName,
        email: email,
        paymentReferenceId: refId,
        amount: amount,
        currency: currency,
        paymentStatus: paymentStatus,
        paymentVerified: false,
        licenseId: null,
        createdAt: now,
      },
    });
  } catch (err) {
    Logger.log("handleCreateOrder CRITICAL ERROR: " + err + " stack=" + err.stack);
    logAuditRecord(
      "system",
      "ORDER_WRITE_FAILED",
      orderId,
      refId,
      null,
      null,
      null,
      "createOrder failed: " + err.toString(),
    );
    return jsonResponse({ success: false, error: "Failed to create order: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * action: "updatePaymentStatus"
 * Provider-agnostic payment webhook / status updater
 * Input: { orderId?, paymentReferenceId?, paymentStatus }
 * Statuses: PENDING, PAID, FAILED, CANCELLED, REFUNDED
 */
function handleUpdatePaymentStatus(data) {
  var orderId = String(data.orderId || "").trim();
  var refId = String(data.paymentReferenceId || "").trim();
  var newStatus = String(data.paymentStatus || "")
    .toUpperCase()
    .trim();

  var validStatuses = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"];
  if (validStatuses.indexOf(newStatus) === -1) {
    return jsonResponse({ success: false, error: "Invalid payment status: " + newStatus });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(25000);

  try {
    var ordSheet = getOrdersSheet();
    var rowIdx = -1;
    if (orderId) {
      rowIdx = findOrderRowById(ordSheet, orderId);
    } else if (refId) {
      rowIdx = findOrderRowByRef(ordSheet, refId);
    }

    if (rowIdx === -1) {
      return jsonResponse({ success: false, error: "Order not found." });
    }

    var now = new Date().toISOString();
    var rowValues = ordSheet.getRange(rowIdx, 1, 1, ORD_COL.TOTAL).getValues()[0];
    var currentPaymentStatus = String(rowValues[ORD_COL.PAYMENT_STATUS - 1] || "").toUpperCase();
    var isVerified = Boolean(rowValues[ORD_COL.PAYMENT_VERIFIED - 1]);
    var linkedLicenseId = String(rowValues[ORD_COL.LICENSE_ID - 1] || "").trim();
    ordSheet.getRange(rowIdx, ORD_COL.PAYMENT_STATUS).setValue(newStatus);
    ordSheet.getRange(rowIdx, ORD_COL.UPDATED_AT).setValue(now);

    // If payment is confirmed PAID via webhook, automatically provision license & mark verified
    if (newStatus === "PAID") {
      processCheckboxEdit(rowIdx, true, "webhook");
    } else if (newStatus === "FAILED" || newStatus === "CANCELLED" || newStatus === "REFUNDED") {
      ordSheet.getRange(rowIdx, ORD_COL.PAYMENT_VERIFIED).setValue(false); // uncheck checkbox

      if (linkedLicenseId) {
        var licSheet = getLicenseSheet();
        var licRowIdx = findLicenseRowById(licSheet, linkedLicenseId);
        if (licRowIdx !== -1) {
          var licStatus = String(licSheet.getRange(licRowIdx, 7).getValue()).toUpperCase();
          if (licStatus !== "REVOKED") {
            licSheet.getRange(licRowIdx, 7).setValue("PENDING");
            logAuditRecord(
              "system",
              "SUSPEND_LICENSE",
              rowValues[0],
              rowValues[3],
              linkedLicenseId,
              licStatus,
              "PENDING",
              "Payment became " + newStatus + ". License moved to PENDING.",
            );
          }
        }
      }
    }

    SpreadsheetApp.flush();

    logAuditRecord(
      "webhook",
      "UPDATE_PAYMENT_STATUS",
      rowValues[0],
      rowValues[3],
      linkedLicenseId,
      currentPaymentStatus,
      newStatus,
      "Payment status updated to " + newStatus,
    );

    return jsonResponse({
      success: true,
      message: "Payment status updated to " + newStatus,
      orderId: rowValues[0],
      paymentStatus: newStatus,
      paymentVerified: Boolean(ordSheet.getRange(rowIdx, 8).getValue()),
    });
  } finally {
    lock.releaseLock();
  }
}

// ── 5. Protected Administrator Operations (/console) ──────────────────────────
/**
 * action: "verifyPayment"
 * MANDATORY IDEMPOTENCY & DUPLICATE PREVENTION:
 * Repeated clicks MUST create: ONE Order, ONE License ID, ONE License Key, ONE automatic email.
 * Input: { orderId?, paymentReferenceId? }
 */
function handleVerifyPayment(data, adminUser) {
  var orderId = String(data.orderId || "").trim();
  var refId = String(data.paymentReferenceId || "").trim();

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return jsonResponse({ success: false, error: "System lock busy. Please retry." });
  }

  try {
    var ordSheet = getOrdersSheet();
    var ordRowIdx = -1;
    if (orderId) {
      ordRowIdx = findOrderRowById(ordSheet, orderId);
    } else if (refId) {
      ordRowIdx = findOrderRowByRef(ordSheet, refId);
    }

    if (ordRowIdx === -1) {
      Logger.log("handleVerifyPayment: Order not found. orderId=" + orderId + " refId=" + refId);
      return jsonResponse({ success: false, error: "Order not found." });
    }

    var ordValues = ordSheet.getRange(ordRowIdx, 1, 1, ORD_COL.TOTAL).getValues()[0];
    var curOrderId = String(ordValues[0]);
    var custName = String(ordValues[1]);
    var email = normalizeEmail(ordValues[2]);
    var curRefId = String(ordValues[3]);
    var existingLicenseId = String(ordValues[8] || "").trim();
    var credentialsSentAt = String(ordValues[11] || "").trim();
    var now = new Date().toISOString();

    Logger.log(
      "handleVerifyPayment: Processing orderId=" +
        curOrderId +
        " email=" +
        email +
        " existingLicenseId=" +
        existingLicenseId,
    );

    var licSheet = getLicenseSheet();
    var licRowIdx = -1;
    var targetLicId = existingLicenseId;
    var targetLicKey = "";

    // 1. Check if license already exists for this order
    if (targetLicId) {
      licRowIdx = findLicenseRowById(licSheet, targetLicId);
      Logger.log("handleVerifyPayment: findLicenseRowById(" + targetLicId + ") = " + licRowIdx);
    }

    // 2. Also check if an active license already exists for this customer email
    if (licRowIdx === -1 && email) {
      licRowIdx = findLicenseRowByEmail(licSheet, email);
      Logger.log("handleVerifyPayment: findLicenseRowByEmail(" + email + ") = " + licRowIdx);
      if (licRowIdx !== -1) {
        var existingLicVals = licSheet.getRange(licRowIdx, 1, 1, 11).getValues()[0];
        targetLicId = String(existingLicVals[0]);
      }
    }

    if (licRowIdx !== -1) {
      // License exists -> REUSE IT (Never create duplicate license!)
      var licValues = licSheet.getRange(licRowIdx, 1, 1, 11).getValues()[0];
      targetLicKey = String(licValues[3]);
      var currentLicStatus = String(licValues[6]).toUpperCase();
      Logger.log(
        "handleVerifyPayment: Reusing license " + targetLicId + " status=" + currentLicStatus,
      );

      // Do NOT automatically reactivate a REVOKED license!
      if (currentLicStatus !== "REVOKED") {
        licSheet.getRange(licRowIdx, 7).setValue("ACTIVE");
        SpreadsheetApp.flush();
      }
    } else {
      // Generate exactly ONE new license: LIC-000001 format + XXXX-XXXX-XXXX-XXXX key
      targetLicId = generateNextLicenseId(licSheet);
      targetLicKey = generateUniqueLicenseKey(licSheet);
      Logger.log(
        "handleVerifyPayment: Creating NEW license " +
          targetLicId +
          " key=" +
          targetLicKey +
          " for " +
          email,
      );

      var newLicRow = [
        targetLicId,
        custName,
        email,
        targetLicKey,
        "",
        1,
        "ACTIVE",
        now,
        "",
        "",
        CONFIG.VERSION,
      ];
      licSheet.appendRow(newLicRow);
      SpreadsheetApp.flush();
      Logger.log(
        "handleVerifyPayment: appendRow done. licSheet.getLastRow()=" + licSheet.getLastRow(),
      );
    }

    // Update Orders sheet: Set Payment Status = ACTIVE, Payment Verified = TRUE
    ordSheet.getRange(ordRowIdx, ORD_COL.PAYMENT_STATUS).setValue("ACTIVE");
    ordSheet.getRange(ordRowIdx, ORD_COL.PAYMENT_VERIFIED).setValue(true);
    ordSheet.getRange(ordRowIdx, ORD_COL.LICENSE_ID).setValue(targetLicId);
    ordSheet.getRange(ordRowIdx, ORD_COL.VERIFIED_AT).setValue(now);
    ordSheet.getRange(ordRowIdx, ORD_COL.UPDATED_AT).setValue(now);
    try {
      ordSheet.getRange(ordRowIdx, ORD_COL.LICENSE_ID).setNote("License Key: " + targetLicKey + "\nStatus: ACTIVE");
    } catch (nErr) {}
    SpreadsheetApp.flush();
    Logger.log("handleVerifyPayment: Orders row updated for " + curOrderId);

    // Duplicate Email Prevention: Only send automatic email if NOT already sent
    var emailSent = false;
    var emailDeliveryStatus = "PENDING";
    var emailError = "";

    if (!credentialsSentAt) {
      try {
        sendCredentialsEmail(custName, email, targetLicId, targetLicKey);
        ordSheet.getRange(ordRowIdx, ORD_COL.CREDENTIALS_SENT_AT).setValue(now);
        ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_DELIVERY_STATUS).setValue("SENT");
        ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_ERROR).setValue("");
        emailSent = true;
        emailDeliveryStatus = "SENT";
        Logger.log("handleVerifyPayment: Email sent to " + email);
        logAuditRecord(
          adminUser,
          "CREDENTIALS_SENT",
          curOrderId,
          curRefId,
          targetLicId,
          null,
          "SENT",
          "Credentials email sent to " + email,
        );
      } catch (emErr) {
        Logger.log("handleVerifyPayment: EMAIL FAILED: " + emErr);
        emailError = emErr.toString();
        ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_DELIVERY_STATUS).setValue("FAILED");
        ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_ERROR).setValue(emailError);
        emailDeliveryStatus = "FAILED";
        logAuditRecord(
          adminUser,
          "EMAIL_SEND_FAILED",
          curOrderId,
          curRefId,
          targetLicId,
          null,
          null,
          "Email delivery failed: " + emailError,
        );
      }
    } else {
      Logger.log("handleVerifyPayment: Email skip (already sent " + credentialsSentAt + ")");
    }

    logAuditRecord(
      adminUser,
      "PAYMENT_VERIFIED",
      curOrderId,
      curRefId,
      targetLicId,
      "PENDING",
      "ACTIVE",
      "Payment manually verified by admin. License " + targetLicId + " provisioned.",
    );

    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      message: "Payment verified successfully. License provisioned.",
      orderId: curOrderId,
      paymentVerified: true,
      licenseId: targetLicId,
      licenseKey: targetLicKey,
      emailSent: emailSent,
      emailDeliveryStatus: emailDeliveryStatus,
      emailError: emailError,
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * action: "unverifyPayment"
 * Toggles Payment Verified = FALSE
 * Controlled state transition:
 * - If linked license is not REVOKED, sets status to PENDING.
 * - Does NOT delete license or key.
 * - Does NOT erase Device ID.
 */
function handleUnverifyPayment(data, adminUser) {
  var orderId = String(data.orderId || "").trim();
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);

  try {
    var ordSheet = getOrdersSheet();
    var ordRowIdx = findOrderRowById(ordSheet, orderId);
    if (ordRowIdx === -1) {
      return jsonResponse({ success: false, error: "Order not found." });
    }

    var ordValues = ordSheet.getRange(ordRowIdx, 1, 1, ORD_COL.TOTAL).getValues()[0];
    var licId = String(ordValues[ORD_COL.LICENSE_ID - 1] || "").trim();
    var now = new Date().toISOString();

    ordSheet.getRange(ordRowIdx, ORD_COL.PAYMENT_STATUS).setValue("UNACTIVE");
    ordSheet.getRange(ordRowIdx, ORD_COL.PAYMENT_VERIFIED).setValue(false);
    ordSheet.getRange(ordRowIdx, ORD_COL.UPDATED_AT).setValue(now);

    if (licId) {
      var licSheet = getLicenseSheet();
      var licRowIdx = findLicenseRowById(licSheet, licId);
      if (licRowIdx !== -1) {
        var currentLicStatus = String(
          licSheet.getRange(licRowIdx, LIC_COL.STATUS).getValue(),
        ).toUpperCase();
        if (currentLicStatus !== "REVOKED") {
          licSheet.getRange(licRowIdx, LIC_COL.STATUS).setValue("PENDING");
        }
      }
    }

    logAuditRecord(
      adminUser,
      "PAYMENT_UNVERIFIED",
      orderId,
      ordValues[ORD_COL.PAYMENT_REF_ID - 1],
      licId,
      "ACTIVE",
      "UNACTIVE",
      "Payment unverified by administrator.",
    );
    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      message: "Payment unverified. Status reverted to UNACTIVE.",
      orderId: orderId,
      paymentStatus: "UNACTIVE",
      paymentVerified: false,
      licenseStatus: "PENDING",
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * action: "resendCredentials"
 * Reuses EXISTING License ID and License Key. Never creates another license.
 */
function handleResendCredentials(data, adminUser) {
  var orderId = String(data.orderId || "").trim();
  var ordSheet = getOrdersSheet();
  var ordRowIdx = findOrderRowById(ordSheet, orderId);
  if (ordRowIdx === -1) {
    return jsonResponse({ success: false, error: "Order not found." });
  }

  var ordValues = ordSheet.getRange(ordRowIdx, 1, 1, ORD_COL.TOTAL).getValues()[0];
  var custName = String(ordValues[ORD_COL.CUSTOMER_NAME - 1]);
  var email = normalizeEmail(ordValues[ORD_COL.EMAIL - 1]);
  var licId = String(ordValues[ORD_COL.LICENSE_ID - 1] || "").trim();

  if (!licId) {
    return jsonResponse({
      success: false,
      error: "Order does not have an active license provisioned yet.",
    });
  }

  var licSheet = getLicenseSheet();
  var licRowIdx = findLicenseRowById(licSheet, licId);
  if (licRowIdx === -1) {
    return jsonResponse({ success: false, error: "Linked license record not found." });
  }

  var licValues = licSheet.getRange(licRowIdx, 1, 1, LIC_COL.TOTAL).getValues()[0];
  var licKey = String(licValues[LIC_COL.LICENSE_KEY - 1]);
  var now = new Date().toISOString();

  try {
    sendCredentialsEmail(custName, email, licId, licKey);
    ordSheet.getRange(ordRowIdx, ORD_COL.CREDENTIALS_SENT_AT).setValue(now);
    ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_DELIVERY_STATUS).setValue("SENT");
    ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_ERROR).setValue("");
    ordSheet.getRange(ordRowIdx, ORD_COL.UPDATED_AT).setValue(now);
    SpreadsheetApp.flush();
    logAuditRecord(
      adminUser,
      "CREDENTIALS_RESENT",
      orderId,
      ordValues[ORD_COL.PAYMENT_REF_ID - 1],
      licId,
      null,
      "SENT",
      "Credentials resent to " + email,
    );
    return jsonResponse({
      success: true,
      message: "Credentials successfully resent to " + email,
      licenseId: licId,
      licenseKey: licKey,
    });
  } catch (err) {
    ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_DELIVERY_STATUS).setValue("FAILED");
    ordSheet.getRange(ordRowIdx, ORD_COL.EMAIL_ERROR).setValue(err.toString());
    logAuditRecord(
      adminUser,
      "EMAIL_SEND_FAILED",
      orderId,
      ordValues[ORD_COL.PAYMENT_REF_ID - 1],
      licId,
      null,
      null,
      "Resend failed: " + err.toString(),
    );
    return jsonResponse({ success: false, error: "Email delivery failed: " + err.toString() });
  }
}

/**
 * action: "resetDevice"
 * Clears Device ID and Activated At. Preserves License ID and License Key.
 */
function handleResetDevice(data, adminUser) {
  var licenseId = String(data.licenseId || "").trim();
  if (!licenseId) {
    return jsonResponse({ success: false, error: "License ID is required." });
  }

  var sheet = getLicenseSheet();
  var rowIdx = findLicenseRowById(sheet, licenseId);
  if (rowIdx === -1) {
    return jsonResponse({ success: false, error: "License not found." });
  }

  var rowValues = sheet.getRange(rowIdx, 1, 1, 11).getValues()[0];
  var oldDeviceId = String(rowValues[4] || "");

  sheet.getRange(rowIdx, 5).setValue(""); // Device ID = blank
  sheet.getRange(rowIdx, 9).setValue(""); // Activated At = blank
  SpreadsheetApp.flush();

  logAuditRecord(
    adminUser,
    "DEVICE_RESET",
    null,
    null,
    licenseId,
    oldDeviceId || "UNBOUND",
    "CLEARED",
    "Device binding reset. License can activate on a new device.",
  );

  return jsonResponse({
    success: true,
    message: "Device binding reset successfully. License can now be activated on another device.",
    licenseId: licenseId,
  });
}

/**
 * action: "revokeLicense"
 * Sets Status = "REVOKED"
 */
function handleRevokeLicense(data, adminUser) {
  var licenseId = String(data.licenseId || "").trim();
  if (!licenseId) {
    return jsonResponse({ success: false, error: "License ID is required." });
  }

  var sheet = getLicenseSheet();
  var rowIdx = findLicenseRowById(sheet, licenseId);
  if (rowIdx === -1) {
    return jsonResponse({ success: false, error: "License not found." });
  }

  var currentStatus = String(sheet.getRange(rowIdx, 7).getValue());
  sheet.getRange(rowIdx, 7).setValue("REVOKED");
  SpreadsheetApp.flush();

  logAuditRecord(
    adminUser,
    "LICENSE_REVOKED",
    null,
    null,
    licenseId,
    currentStatus,
    "REVOKED",
    "License explicitly revoked by administrator.",
  );

  return jsonResponse({
    success: true,
    message: "License revoked.",
    licenseId: licenseId,
    status: "REVOKED",
  });
}

/**
 * action: "deleteOrder"
 * Deletes an order from the Orders sheet and cleans/revokes unactivated licenses.
 */
function handleDeleteOrder(data, adminUser) {
  var orderId = String(data.orderId || "").trim();
  if (!orderId) {
    return jsonResponse({ success: false, error: "Order ID is required." });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(25000);

  try {
    var ordSheet = getOrdersSheet();
    var rowIdx = findOrderRowById(ordSheet, orderId);
    if (rowIdx === -1) {
      return jsonResponse({ success: false, error: "Order not found." });
    }

    var rowValues = ordSheet.getRange(rowIdx, 1, 1, ORD_COL.TOTAL).getValues()[0];
    var refId = String(rowValues[3] || "");
    var licId = String(rowValues[8] || "");

    ordSheet.deleteRow(rowIdx);

    if (licId) {
      var licSheet = getLicenseSheet();
      var licRowIdx = findLicenseRowById(licSheet, licId);
      if (licRowIdx !== -1) {
        var licVals = licSheet.getRange(licRowIdx, 1, 1, 11).getValues()[0];
        var device = String(licVals[4] || "").trim();
        if (!device) {
          licSheet.deleteRow(licRowIdx);
        } else {
          licSheet.getRange(licRowIdx, 7).setValue("REVOKED");
        }
      }
    }

    SpreadsheetApp.flush();
    logAuditRecord(
      adminUser,
      "ORDER_DELETED",
      orderId,
      refId,
      licId,
      "EXISTING",
      "DELETED",
      "Order deleted by administrator.",
    );

    return jsonResponse({
      success: true,
      message: "Order " + orderId + " deleted successfully.",
      orderId: orderId,
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * action: "getOrders"
 */
function handleGetOrders() {
  var ordSheet = getOrdersSheet();
  var licSheet = getLicenseSheet();
  var lastRow = ordSheet.getLastRow();

  if (lastRow <= 1) {
    return jsonResponse({ success: true, orders: [] });
  }

  var ordData = ordSheet.getRange(2, 1, lastRow - 1, ORD_COL.TOTAL).getValues();
  var licMap = getLicenseMap(licSheet);

  var orders = [];
  for (var i = 0; i < ordData.length; i++) {
    var r = ordData[i];
    var licId = String(r[ORD_COL.LICENSE_ID - 1] || "").trim();
    var licInfo = licId ? licMap[licId] : null;

    orders.push({
      orderId: String(r[ORD_COL.ORDER_ID - 1]),
      customerName: String(r[ORD_COL.CUSTOMER_NAME - 1]),
      email: String(r[ORD_COL.EMAIL - 1]),
      paymentReferenceId: String(r[ORD_COL.PAYMENT_REF_ID - 1]),
      amount: Number(r[ORD_COL.AMOUNT - 1]) || 0,
      currency: String(r[ORD_COL.CURRENCY - 1] || "INR"),
      paymentStatus: String(r[ORD_COL.PAYMENT_STATUS - 1] || "PENDING"),
      paymentVerified: Boolean(r[ORD_COL.PAYMENT_VERIFIED - 1]),
      licenseId: licId || null,
      licenseStatus: licInfo
        ? licInfo.status
        : Boolean(r[ORD_COL.PAYMENT_VERIFIED - 1])
          ? "ACTIVE"
          : "PENDING",
      licenseKey: licInfo ? licInfo.licenseKey : null,
      deviceId: licInfo ? licInfo.deviceId : null,
      createdAt: r[ORD_COL.CREATED_AT - 1] ? new Date(r[ORD_COL.CREATED_AT - 1]).toISOString() : "",
      verifiedAt: r[ORD_COL.VERIFIED_AT - 1]
        ? new Date(r[ORD_COL.VERIFIED_AT - 1]).toISOString()
        : null,
      credentialsSentAt: r[ORD_COL.CREDENTIALS_SENT_AT - 1]
        ? new Date(r[ORD_COL.CREDENTIALS_SENT_AT - 1]).toISOString()
        : null,
      emailDeliveryStatus: String(r[ORD_COL.EMAIL_DELIVERY_STATUS - 1] || "PENDING"),
      emailError: String(r[ORD_COL.EMAIL_ERROR - 1] || ""),
      paymentProvider: String(r[ORD_COL.PAYMENT_PROVIDER - 1] || ""),
      paymentFailureReason: String(r[ORD_COL.PAYMENT_FAILURE_REASON - 1] || ""),
      updatedAt: r[ORD_COL.UPDATED_AT - 1] ? new Date(r[ORD_COL.UPDATED_AT - 1]).toISOString() : "",
    });
  }

  return jsonResponse({ success: true, orders: orders });
}

function handleGetOrder(data) {
  var orderId = String(data.orderId || "").trim();
  var refId = String(data.paymentReferenceId || "").trim();

  var sheet = getOrdersSheet();
  var rowIdx = -1;
  if (orderId) rowIdx = findOrderRowById(sheet, orderId);
  else if (refId) rowIdx = findOrderRowByRef(sheet, refId);

  if (rowIdx === -1) {
    return jsonResponse({ success: false, error: "Order not found." });
  }

  var row = sheet.getRange(rowIdx, 1, 1, ORD_COL.TOTAL).getValues()[0];
  return jsonResponse({ success: true, order: formatOrderRow(row) });
}

function handleGetOrderStatus(data) {
  var orderId = String(data.orderId || "").trim();
  var refId = String(data.paymentReferenceId || data.reference || "").trim();
  var email = normalizeEmail(data.email || "");

  var ordSheet = getOrdersSheet();
  var rowIdx = -1;
  if (orderId) rowIdx = findOrderRowById(ordSheet, orderId);
  if (rowIdx === -1 && refId) rowIdx = findOrderRowByRef(ordSheet, refId);
  if (rowIdx === -1 && email) rowIdx = findOrderRowByEmail(ordSheet, email);

  if (rowIdx === -1) {
    return jsonResponse({ success: false, error: "Order not found." });
  }

  var row = ordSheet.getRange(rowIdx, 1, 1, ORD_COL.TOTAL).getValues()[0];
  var licId = String(row[ORD_COL.LICENSE_ID - 1] || "").trim();
  var isVerified = Boolean(row[ORD_COL.PAYMENT_VERIFIED - 1]);
  var pStatus = String(row[ORD_COL.PAYMENT_STATUS - 1] || "UNACTIVE");

  var licInfo = null;
  if (licId) {
    var licSheet = getLicenseSheet();
    var licMap = getLicenseMap(licSheet);
    licInfo = licMap[licId] || null;
  }

  return jsonResponse({
    success: true,
    orderId: String(row[ORD_COL.ORDER_ID - 1]),
    customerName: String(row[ORD_COL.CUSTOMER_NAME - 1]),
    email: String(row[ORD_COL.EMAIL - 1]),
    paymentReferenceId: String(row[ORD_COL.PAYMENT_REF_ID - 1]),
    amount: Number(row[ORD_COL.AMOUNT - 1]) || 0,
    currency: String(row[ORD_COL.CURRENCY - 1] || "INR"),
    paymentStatus: pStatus,
    paymentVerified: isVerified,
    licenseId: licId || null,
    licenseKey: licInfo ? licInfo.licenseKey : null,
    licenseStatus: licInfo ? licInfo.status : (isVerified ? "ACTIVE" : "PENDING"),
    deviceId: licInfo ? licInfo.deviceId : null,
    verifiedAt: row[ORD_COL.VERIFIED_AT - 1] ? new Date(row[ORD_COL.VERIFIED_AT - 1]).toISOString() : null,
    credentialsSentAt: row[ORD_COL.CREDENTIALS_SENT_AT - 1] ? new Date(row[ORD_COL.CREDENTIALS_SENT_AT - 1]).toISOString() : null,
  });
}

function handleGetAuditLogs() {
  var sheet = getAuditSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResponse({ success: true, auditLogs: [] });

  var data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  var list = [];
  for (var i = data.length - 1; i >= 0; i--) {
    // reverse chronological
    var r = data[i];
    list.push({
      timestamp: r[0] ? new Date(r[0]).toISOString() : "",
      adminUser: String(r[1] || ""),
      action: String(r[2] || ""),
      orderId: String(r[3] || "") || null,
      paymentReferenceId: String(r[4] || "") || null,
      licenseId: String(r[5] || "") || null,
      previousStatus: String(r[6] || "") || null,
      newStatus: String(r[7] || "") || null,
      details: String(r[8] || ""),
    });
  }
  return jsonResponse({ success: true, auditLogs: list });
}

// ── 6. Customer Credentials Email ─────────────────────────────────────────────
function sendCredentialsEmail(name, toEmail, licenseId, licenseKey) {
  var subject = "Your Flow Paste License is Ready";
  var body = [
    "Hello " + (name || "there") + ",\n\n",
    "Thank you for purchasing Flow Paste!\n",
    "Your payment has been verified and your Flow Paste license is active.\n\n",
    "────────────────────────────────────────────────────────\n",
    "Registered Email : " + toEmail + "\n",
    "License Key      : " + licenseKey + "\n",
    "License ID       : " + licenseId + "\n",
    "Maximum Devices  : 1 Device\n",
    "────────────────────────────────────────────────────────\n\n",
    "Quick Setup Instructions:\n",
    "1. Open Google Chrome and click the Flow Paste extension icon.\n",
    "2. Enter your registered email: " + toEmail + "\n",
    "3. Enter your License Key: " + licenseKey + "\n",
    '4. Click "Activate". Your current device will be bound automatically.\n',
    "5. Use Alt+Q on CodeChef or paste your snippets instantly!\n\n",
    "Need assistance? Reply directly to this email.\n\n",
    "Best regards,\nFlow Paste Team",
  ].join("");

  MailApp.sendEmail({
    to: toEmail,
    subject: subject,
    body: body,
    name: "Flow Paste",
  });
}

// ── 7. Audit Logging ──────────────────────────────────────────────────────────
function logAuditRecord(
  adminUser,
  action,
  orderId,
  paymentRefId,
  licenseId,
  prevStatus,
  newStatus,
  details,
) {
  try {
    var sheet = getAuditSheet();
    var now = new Date().toISOString();
    sheet.appendRow([
      now,
      adminUser || CONFIG.ADMIN_USERNAME,
      action,
      orderId || "",
      paymentRefId || "",
      licenseId || "",
      prevStatus || "",
      newStatus || "",
      details || "",
    ]);
  } catch (e) {
    Logger.log("Audit log failed: " + e);
  }
}

// ── 8. Utility Functions & ID Generation ──────────────────────────────────────
function getLicenseSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.LICENSES);
  if (!sheet) {
    setupSystem();
    sheet = ss.getSheetByName(SHEET_NAMES.LICENSES);
  }
  return sheet;
}

function getOrdersSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
  if (!sheet) {
    setupSystem();
    sheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
  }
  return sheet;
}

function getAuditSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.AUDIT);
  if (!sheet) {
    setupSystem();
    sheet = ss.getSheetByName(SHEET_NAMES.AUDIT);
  }
  return sheet;
}

function findLicenseRowIndex(sheet, email, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var data = sheet.getRange(2, 3, lastRow - 1, 2).getValues(); // col 3: Email, col 4: Key
  for (var i = 0; i < data.length; i++) {
    if (normalizeEmail(data[i][0]) === email && normalizeKey(data[i][1]) === key) {
      return i + 2;
    }
  }
  return -1;
}

function findLicenseRowById(sheet, licenseId) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === licenseId.toUpperCase()) {
      return i + 2;
    }
  }
  return -1;
}

function findLicenseRowByEmail(sheet, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var data = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (normalizeEmail(data[i][0]) === email) {
      return i + 2;
    }
  }
  return -1;
}

function findOrderRowById(sheet, orderId) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === orderId.toUpperCase()) {
      return i + 2;
    }
  }
  return -1;
}

function findOrderRowByRef(sheet, refId) {
  if (!refId || refId.trim() === "") return -1; // Never match empty refId
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var data = sheet.getRange(2, ORD_COL.PAYMENT_REF_ID, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === refId.trim().toUpperCase()) {
      return i + 2;
    }
  }
  return -1;
}

function findOrderRowByEmail(sheet, email) {
  if (!email || email.trim() === "") return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var data = sheet.getRange(2, ORD_COL.EMAIL, lastRow - 1, 1).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (normalizeEmail(data[i][0]) === normalizeEmail(email)) {
      return i + 2;
    }
  }
  return -1;
}

function getLicenseMap(sheet) {
  var lastRow = sheet.getLastRow();
  var map = {};
  if (lastRow <= 1) return map;
  var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  for (var i = 0; i < data.length; i++) {
    var id = String(data[i][0]).trim();
    map[id] = {
      licenseKey: data[i][3],
      deviceId: data[i][4],
      status: data[i][6],
    };
  }
  return map;
}

/** Generates sequential License ID: LIC-000001, LIC-000002, ... */
function generateNextLicenseId(sheet) {
  var lastRow = sheet.getLastRow();
  var maxNum = 0;
  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var match = String(ids[i][0]).match(/^LIC-(\d+)$/i);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  var nextNum = maxNum + 1;
  return "LIC-" + ("000000" + nextNum).slice(-6);
}

/** Generates secure random 16-character license key: 7A3F-91BC-4D82-E6A1 */
function generateUniqueLicenseKey(sheet) {
  var existing = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var keys = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      existing[String(keys[i][0]).trim().toUpperCase()] = true;
    }
  }

  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (var attempt = 0; attempt < 50; attempt++) {
    var parts = [];
    for (var p = 0; p < 4; p++) {
      var seg = "";
      for (var c = 0; c < 4; c++) {
        seg += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      parts.push(seg);
    }
    var candidate = parts.join("-");
    if (!existing[candidate]) {
      return candidate;
    }
  }
  return "LIC-" + Utilities.getUuid().substring(0, 16).toUpperCase();
}

function isValidEmail(email) {
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeKey(key) {
  return String(key || "")
    .trim()
    .toUpperCase();
}

function formatOrderRow(r) {
  return {
    orderId: String(r[ORD_COL.ORDER_ID - 1]),
    customerName: String(r[ORD_COL.CUSTOMER_NAME - 1]),
    email: String(r[ORD_COL.EMAIL - 1]),
    paymentReferenceId: String(r[ORD_COL.PAYMENT_REF_ID - 1]),
    amount: Number(r[ORD_COL.AMOUNT - 1]) || 0,
    currency: String(r[ORD_COL.CURRENCY - 1] || "INR"),
    paymentStatus: String(r[ORD_COL.PAYMENT_STATUS - 1] || "PENDING"),
    paymentVerified: Boolean(r[ORD_COL.PAYMENT_VERIFIED - 1]),
    licenseId: r[ORD_COL.LICENSE_ID - 1] ? String(r[ORD_COL.LICENSE_ID - 1]) : null,
    createdAt: r[ORD_COL.CREATED_AT - 1] ? new Date(r[ORD_COL.CREATED_AT - 1]).toISOString() : "",
    verifiedAt: r[ORD_COL.VERIFIED_AT - 1]
      ? new Date(r[ORD_COL.VERIFIED_AT - 1]).toISOString()
      : null,
    credentialsSentAt: r[ORD_COL.CREDENTIALS_SENT_AT - 1]
      ? new Date(r[ORD_COL.CREDENTIALS_SENT_AT - 1]).toISOString()
      : null,
    emailDeliveryStatus: String(r[ORD_COL.EMAIL_DELIVERY_STATUS - 1] || "PENDING"),
    emailError: String(r[ORD_COL.EMAIL_ERROR - 1] || ""),
    paymentProvider: String(r[ORD_COL.PAYMENT_PROVIDER - 1] || ""),
    paymentFailureReason: String(r[ORD_COL.PAYMENT_FAILURE_REASON - 1] || ""),
    updatedAt: r[ORD_COL.UPDATED_AT - 1] ? new Date(r[ORD_COL.UPDATED_AT - 1]).toISOString() : "",
  };
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/** Manual Admin prompt for backward compatibility */
function createLicensePrompt() {
  var ui = SpreadsheetApp.getUi();
  var nameResponse = ui.prompt("Create License", "Enter Customer Name:", ui.ButtonSet.OK_CANCEL);
  if (nameResponse.getSelectedButton() !== ui.Button.OK) return;
  var name = nameResponse.getResponseText().trim();

  var emailResponse = ui.prompt("Create License", "Enter Customer Email:", ui.ButtonSet.OK_CANCEL);
  if (emailResponse.getSelectedButton() !== ui.Button.OK) return;
  var email = emailResponse.getResponseText().trim();

  if (!name || !email || !isValidEmail(email)) {
    ui.alert("Invalid name or email.");
    return;
  }

  var sheet = getLicenseSheet();
  var licId = generateNextLicenseId(sheet);
  var licKey = generateUniqueLicenseKey(sheet);
  var now = new Date().toISOString();

  sheet.appendRow([licId, name, email, licKey, "", 1, "ACTIVE", now, "", "", CONFIG.VERSION]);
  SpreadsheetApp.flush();

  logAuditRecord(
    CONFIG.ADMIN_USERNAME,
    "LICENSE_CREATED",
    null,
    null,
    licId,
    null,
    "ACTIVE",
    "Manual license created for " + name,
  );

  ui.alert("License Created:\n\nID: " + licId + "\nKey: " + licKey);
}
