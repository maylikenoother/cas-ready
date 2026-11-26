"use client";

import { useState } from "react";
import { saveProfile } from "@/app/(app)/profile/actions";

export type Option = { id: string; label: string; universityId?: string };

export function ProfileForm({
  values,
  universities,
  courses,
}: {
  values: Record<string, string>;
  universities: Option[];
  courses: Option[];
}) {
  const [universityId, setUniversityId] = useState(values.universityId || "");
  const [message, setMessage] = useState("");
  const visibleCourses = courses.filter((course) => !universityId || course.universityId === universityId);

  return (
    <form
      className="stack"
      action={async (formData) => {
        const result = await saveProfile(formData);
        setMessage("error" in result ? result.error : "Saved. Answers are checked against these details.");
      }}
    >
      <div className="grid-2">
        <label className="field"><span>Name</span><input name="fullName" defaultValue={values.fullName} /></label>
        <label className="field">
          <span>Home country</span>
          <input name="homeCountry" list="countries" defaultValue={values.homeCountry} />
          <datalist id="countries">
            {["Nigeria", "Ghana", "Pakistan", "Kenya", "India"].map((country) => <option key={country} value={country} />)}
          </datalist>
        </label>
        <label className="field">
          <span>University</span>
          <select name="universityId" value={universityId} onChange={(event) => setUniversityId(event.target.value)}>
            <option value="">Not chosen yet</option>
            {universities.map((university) => <option key={university.id} value={university.id}>{university.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Course</span>
          <select name="courseId" defaultValue={values.courseId}>
            <option value="">Not chosen yet</option>
            {visibleCourses.map((course) => <option key={course.id} value={course.id}>{course.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Previous qualification</span><input name="previousQualification" defaultValue={values.previousQualification} /></label>
        <label className="field"><span>English test and score</span><input name="englishTest" defaultValue={values.englishTest} /></label>
        <label className="field"><span>Where you plan to live</span><input name="accommodationPlan" defaultValue={values.accommodationPlan} /></label>
        <label className="field"><span>Accommodation cost, GBP</span><input name="accommodationCost" inputMode="decimal" defaultValue={values.accommodationCost} /></label>
        <label className="field"><span>Distance to campus</span><input name="accommodationDistance" defaultValue={values.accommodationDistance} /></label>
        <label className="field"><span>Career goal</span><input name="careerGoal" defaultValue={values.careerGoal} /></label>
      </div>
      <h2>Money details</h2>
      <p className="small muted">Stored separately. A university or agent summary cannot read sponsor income. Use the figures from your offer, not a guess.</p>
      <div className="grid-2">
        <label className="field"><span>Tuition fee, GBP</span><input name="tuitionFee" inputMode="decimal" defaultValue={values.tuitionFee} /></label>
        <label className="field"><span>Deposit paid, GBP</span><input name="depositPaid" inputMode="decimal" defaultValue={values.depositPaid} /></label>
        <label className="field"><span>Sponsor name</span><input name="sponsorName" defaultValue={values.sponsorName} /></label>
        <label className="field"><span>Sponsor occupation</span><input name="sponsorOccupation" defaultValue={values.sponsorOccupation} /></label>
        <label className="field"><span>Sponsor income, as you would say it</span><input name="sponsorIncome" defaultValue={values.sponsorIncome} /></label>
      </div>
      <button className="btn btn-primary" type="submit">Save profile</button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
