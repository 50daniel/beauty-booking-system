CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_no_staff_overlap"
EXCLUDE USING gist (
  "staffId" WITH =,
  tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE ("status" IN ('pending', 'confirmed', 'completed'));
