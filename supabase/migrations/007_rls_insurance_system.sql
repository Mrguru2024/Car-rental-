-- RLS Policies for Insurance & Liability System

-- 1. Protection Plans Policies
-- Public read for active plans
CREATE POLICY "Anyone can view active protection plans"
  ON protection_plans FOR SELECT
  USING (is_active = true);

-- Admin can manage all plans
CREATE POLICY "Admins can manage all protection plans"
  ON protection_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. BYOI Documents Policies
-- Renters can create/read/update own documents
CREATE POLICY "Renters can create their own BYOI documents"
  ON byoi_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = byoi_documents.renter_profile_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

CREATE POLICY "Renters can view their own BYOI documents"
  ON byoi_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = byoi_documents.renter_profile_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

CREATE POLICY "Renters can update their own BYOI documents"
  ON byoi_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = byoi_documents.renter_profile_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

-- Admin can read/update all BYOI documents
CREATE POLICY "Admins can view all BYOI documents"
  ON byoi_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all BYOI documents"
  ON byoi_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. Booking Insurance Elections Policies
-- Renters can create/update for their own bookings only when booking status is draft or pending_payment
CREATE POLICY "Renters can create insurance elections for their own bookings"
  ON booking_insurance_elections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      INNER JOIN profiles ON profiles.user_id = bookings.renter_id
      WHERE bookings.id = booking_insurance_elections.booking_id
      AND profiles.user_id = auth.uid()
      AND bookings.status IN ('draft', 'pending_payment')
    )
  );

CREATE POLICY "Renters can update insurance elections for their own bookings"
  ON booking_insurance_elections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      INNER JOIN profiles ON profiles.user_id = bookings.renter_id
      WHERE bookings.id = booking_insurance_elections.booking_id
      AND profiles.user_id = auth.uid()
      AND bookings.status IN ('draft', 'pending_payment')
    )
  );

CREATE POLICY "Renters can view insurance elections for their own bookings"
  ON booking_insurance_elections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      INNER JOIN profiles ON profiles.user_id = bookings.renter_id
      WHERE bookings.id = booking_insurance_elections.booking_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Admin can read all elections
CREATE POLICY "Admins can view all insurance elections"
  ON booking_insurance_elections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. Liability Acceptances Policies
-- Renters can insert/read own acceptances
CREATE POLICY "Renters can create liability acceptances for their own bookings"
  ON liability_acceptances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = liability_acceptances.user_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

CREATE POLICY "Renters can view their own liability acceptances"
  ON liability_acceptances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = liability_acceptances.user_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

-- Admin can read all acceptances
CREATE POLICY "Admins can view all liability acceptances"
  ON liability_acceptances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Claims Policies
-- Renters can insert/read own claims
CREATE POLICY "Renters can create claims for their own bookings"
  ON claims FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = claims.renter_profile_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

CREATE POLICY "Renters can view their own claims"
  ON claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = claims.renter_profile_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

-- Admin can read/update all claims
CREATE POLICY "Admins can view all claims"
  ON claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all claims"
  ON claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 6. Claim Photos Policies
-- Renters can CRUD photos for own claims
CREATE POLICY "Renters can create photos for their own claims"
  ON claim_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM claims
      INNER JOIN profiles ON profiles.id = claims.renter_profile_id
      WHERE claims.id = claim_photos.claim_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

CREATE POLICY "Renters can view photos for their own claims"
  ON claim_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM claims
      INNER JOIN profiles ON profiles.id = claims.renter_profile_id
      WHERE claims.id = claim_photos.claim_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

CREATE POLICY "Renters can update photos for their own claims"
  ON claim_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM claims
      INNER JOIN profiles ON profiles.id = claims.renter_profile_id
      WHERE claims.id = claim_photos.claim_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

CREATE POLICY "Renters can delete photos for their own claims"
  ON claim_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM claims
      INNER JOIN profiles ON profiles.id = claims.renter_profile_id
      WHERE claims.id = claim_photos.claim_id
      AND profiles.user_id = auth.uid()
      AND profiles.role = 'renter'
    )
  );

-- Admin can read all claim photos
CREATE POLICY "Admins can view all claim photos"
  ON claim_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );