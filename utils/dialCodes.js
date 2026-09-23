/**
 * International dialling codes.
 *
 * Kept as a plain sorted list of the codes themselves, because the only thing this is
 * used for is deciding where a country code ends and a subscriber number begins. Country
 * names live in the frontend selector; matching does not need them.
 *
 * Longest-first matters and is the whole reason this is not a simple prefix test: +1 is
 * the US, but +1242 is the Bahamas, and +7 is Russia while +971 is the UAE. A shortest
 * match would claim a longer code's numbers.
 */

// Every ITU country calling code currently in use, deduplicated. Shared codes (+1 across
// North America, +7 across Russia and Kazakhstan) appear once: for splitting a number
// into code and subscriber, which of those countries it is does not change the answer.
const DIAL_CODES = [
    '1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43',
    '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58',
    '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92',
    '93', '94', '95', '98',
    '211', '212', '213', '216', '218', '220', '221', '222', '223', '224', '225', '226',
    '227', '228', '229', '230', '231', '232', '233', '234', '235', '236', '237', '238',
    '239', '240', '241', '242', '243', '244', '245', '246', '248', '249', '250', '251',
    '252', '253', '254', '255', '256', '257', '258', '260', '261', '262', '263', '264',
    '265', '266', '267', '268', '269', '290', '291', '297', '298', '299',
    '350', '351', '352', '353', '354', '355', '356', '357', '358', '359', '370', '371',
    '372', '373', '374', '375', '376', '377', '378', '379', '380', '381', '382', '383',
    '385', '386', '387', '389',
    '420', '421', '423', '500', '501', '502', '503', '504', '505', '506', '507', '508',
    '509', '590', '591', '592', '593', '594', '595', '596', '597', '598', '599',
    '670', '672', '673', '674', '675', '676', '677', '678', '679', '680', '681', '682',
    '683', '685', '686', '687', '688', '689', '690', '691', '692',
    '850', '852', '853', '855', '856', '880', '886',
    '960', '961', '962', '963', '964', '965', '966', '967', '968', '970', '971', '972',
    '973', '974', '975', '976', '977', '992', '993', '994', '995', '996', '998',
    // NANP territories. Longer than '1' so they are tested first, which is exactly why
    // this list is sorted by length below.
    '1242', '1246', '1264', '1268', '1284', '1340', '1345', '1441', '1473', '1649',
    '1664', '1670', '1671', '1684', '1721', '1758', '1767', '1784', '1809', '1829',
    '1849', '1868', '1869', '1876', '1939',
];

// Longest first, so '1242' is tested before '1' and '971' before '97'.
const SORTED_DIAL_CODES = [...new Set(DIAL_CODES)].sort((a, b) => b.length - a.length);

/**
 * The dialling code a digits-only number starts with, or null.
 *
 * Only meaningful for a number already known to carry a country code -- one written with
 * a leading +. A bare national number cannot be split this way and must not be passed
 * here: "501234567" is a UAE mobile, but it opens with 501, which is Belize, and there is
 * no way to tell those apart from the digits alone. Callers decide that a country code is
 * present; this only says where it ends.
 *
 * Requires at least four digits to remain after the code, so a short number is not read
 * as a country code plus a stub.
 */
const matchCountryCode = (digits) => {
    const d = String(digits || '');
    for (const code of SORTED_DIAL_CODES) {
        if (d.startsWith(code) && d.length - code.length >= 4) return code;
    }
    return null;
};

module.exports = { DIAL_CODES, SORTED_DIAL_CODES, matchCountryCode };
