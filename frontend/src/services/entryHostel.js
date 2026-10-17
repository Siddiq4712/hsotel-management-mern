export function requestEntryHostel(hostels) {
  return new Promise((resolve, reject) => {
    window.dispatchEvent(new CustomEvent('entry-hostel-required', { detail: { hostels, resolve, reject } }));
  });
}
