/* When create a new secret */
export const createBodyRequest = async () => {
  /* Default values for the body */
  let body = {
    /*
     *Accessibility (required, default value is false
     */
    lockedByOwner: false,

    /*
     * Availability (required)
     * Pay attention for !
     */
    otl: true,
    lockAfterUse: false,

    /*
     * Type of secret (password, message, credential, json or qr)
     */
    type: "password",

    ttl: { relative: 604800000 },
  };

  return { body };
};
