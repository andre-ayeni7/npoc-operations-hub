/**
 * NPOC Phone Utilities
 * Centralized phone number handling - single source of truth
 * 
 * @author NPOC Engineering
 * @version 2.0
 */

const PhoneUtils = (() => {
  /**
   * Normalize phone to 234 format
   * Accepts: 08031234567, 2348031234567, +2348031234567, 8031234567
   * Returns: 2348031234567
   */
  function normalize(phone) {
    if (!phone) return '';

    const raw = String(phone)
      .replace(/[^\d]/g, '') // Remove all non-digits

    if (!raw) return '';

    // Already in 234 format
    if (/^234\d{10}$/.test(raw)) return raw;

    // Has leading 0
    if (raw.startsWith('0') && raw.length >= 11) {
      return `234${raw.slice(-10)}`;
    }

    // 10 digits
    if (/^\d{10}$/.test(raw)) {
      return `234${raw}`;
    }

    // Anything else, take last 10 digits
    const last10 = raw.slice(-10);
    if (/^\d{10}$/.test(last10)) {
      return `234${last10}`;
    }

    return '';
  }

  /**
   * Validate phone format
   */
  function validate(phone) {
    const normalized = normalize(phone);
    return /^234\d{10}$/.test(normalized);
  }

  /**
   * Display format for UI (234 903 123 4567)
   */
  function display(phone) {
    const normalized = normalize(phone);
    if (!normalized) return '';
    return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`;
  }

  /**
   * Get country code (should always be 234)
   */
  function getCountry(phone) {
    const normalized = normalize(phone);
    return normalized ? normalized.slice(0, 3) : null;
  }

  /**
   * Estimate operator from number
   */
  function getOperator(phone) {
    const normalized = normalize(phone);
    if (!normalized) return null;

    const firstFour = normalized.slice(3, 7);

    const operators = {
      '9010': 'Airtel',
      '9011': 'Airtel',
      '9012': 'Airtel',
      '9013': 'Airtel',
      '9014': 'Airtel',
      '9015': 'Airtel',
      '9016': 'Airtel',
      '9017': 'Airtel',
      '9018': 'Airtel',
      '803': 'MTN',
      '806': 'MTN',
      '810': 'MTN',
      '813': 'MTN',
      '816': 'MTN',
      '814': 'MTN',
      '807': 'Glo',
      '811': 'Glo',
      '815': 'Glo',
      '905': 'Glo',
      '808': 'Airtel',
      '812': 'Airtel',
      '901': 'Airtel',
      '902': 'Airtel'
    };

    return operators[firstFour] || 'Unknown';
  }

  /**
   * Check if two phones are the same
   */
  function equals(phone1, phone2) {
    return normalize(phone1) === normalize(phone2);
  }

  /**
   * Check if number was recently contacted
   */
  function wasRecentlyContacted(phone, withinDays = 7) {
    const normalized = normalize(phone);
    const lastContact = localStorage.getItem(`npoc-last-contact-${normalized}`);

    if (!lastContact) return false;

    const lastDate = new Date(lastContact);
    const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= withinDays;
  }

  /**
   * Mark phone as contacted now
   */
  function markContacted(phone) {
    const normalized = normalize(phone);
    localStorage.setItem(`npoc-last-contact-${normalized}`, new Date().toISOString());
  }

  /**
   * Extract numeric only
   */
  function digitsOnly(phone) {
    return String(phone || '').replace(/[^\d]/g, '');
  }

  return {
    normalize,
    validate,
    display,
    getCountry,
    getOperator,
    equals,
    wasRecentlyContacted,
    markContacted,
    digitsOnly
  };
})();

// Convenience functions
const cleanPhone = (phone) => PhoneUtils.normalize(phone);
const isValidPhone = (phone) => PhoneUtils.validate(phone);
const displayPhone = (phone) => PhoneUtils.display(phone);
