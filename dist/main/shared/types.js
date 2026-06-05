"use strict";
// ─── Electron IPC API ────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = exports.RecommendationLevel = exports.OverlayPosition = exports.RecommendationContext = exports.RecommendationType = void 0;
// ─── Enums ────────────────────────────────────────────────────────────────────
var RecommendationType;
(function (RecommendationType) {
    RecommendationType["CHAMPION_PICK"] = "CHAMPION_PICK";
    RecommendationType["CHAMPION_BAN"] = "CHAMPION_BAN";
    RecommendationType["ITEM_PURCHASE"] = "ITEM_PURCHASE";
    RecommendationType["STRATEGIC_TIP"] = "STRATEGIC_TIP";
    RecommendationType["OBJECTIVE_TIMING"] = "OBJECTIVE_TIMING";
    RecommendationType["POSITIONING"] = "POSITIONING";
    RecommendationType["VISION"] = "VISION";
})(RecommendationType || (exports.RecommendationType = RecommendationType = {}));
var RecommendationContext;
(function (RecommendationContext) {
    RecommendationContext["CHAMPION_SELECT"] = "CHAMPION_SELECT";
    RecommendationContext["EARLY_GAME"] = "EARLY_GAME";
    RecommendationContext["MID_GAME"] = "MID_GAME";
    RecommendationContext["LATE_GAME"] = "LATE_GAME";
    RecommendationContext["TEAMFIGHT"] = "TEAMFIGHT";
    RecommendationContext["SPLIT_PUSH"] = "SPLIT_PUSH";
})(RecommendationContext || (exports.RecommendationContext = RecommendationContext = {}));
var OverlayPosition;
(function (OverlayPosition) {
    OverlayPosition["TOP_LEFT"] = "TOP_LEFT";
    OverlayPosition["TOP_RIGHT"] = "TOP_RIGHT";
    OverlayPosition["BOTTOM_LEFT"] = "BOTTOM_LEFT";
    OverlayPosition["BOTTOM_RIGHT"] = "BOTTOM_RIGHT";
})(OverlayPosition || (exports.OverlayPosition = OverlayPosition = {}));
var RecommendationLevel;
(function (RecommendationLevel) {
    RecommendationLevel["BASIC"] = "BASIC";
    RecommendationLevel["DETAILED"] = "DETAILED";
    RecommendationLevel["ADVANCED"] = "ADVANCED";
})(RecommendationLevel || (exports.RecommendationLevel = RecommendationLevel = {}));
var Role;
(function (Role) {
    Role["TOP"] = "TOP";
    Role["JUNGLE"] = "JUNGLE";
    Role["MID"] = "MID";
    Role["ADC"] = "ADC";
    Role["SUPPORT"] = "SUPPORT";
})(Role || (exports.Role = Role = {}));
