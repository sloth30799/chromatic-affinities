import type { Chapter } from "@/data/exhibition";
import { campaign } from "@/data/exhibition";
import { CampaignLinks } from "./CampaignLinks";

type CampaignMastheadProps = {
  chapter: Chapter;
};

/** The route's compact campaign register; the moving diptych remains the hero. */
export function CampaignMasthead({ chapter }: CampaignMastheadProps) {
  return (
    <div className="campaign-masthead">
      <p className="exhibition-kicker">{campaign.studio} presents</p>
      <h1 id="campaign-title" className="campaign-masthead__title" tabIndex={-1}>{campaign.title}</h1>
      <p className="campaign-masthead__edition">
        <span>{campaign.collectionName}</span>
        <span>{campaign.collectionCode}</span>
      </p>
      <p className="campaign-masthead__opening">{campaign.openingLine}</p>
      <p className="campaign-masthead__disclosure">{campaign.disclosure}</p>
      <p className="chapter-number">{chapter.number} / 04</p>
      <h2 id={`${chapter.id}-heading`} tabIndex={-1}>
        <span>{chapter.from.name}</span>
        <i aria-hidden="true">↔</i>
        <span>{chapter.to.name}</span>
      </h2>
      <p className="campaign-masthead__study"><span>Study {chapter.number}</span>{chapter.studyTitle}</p>
      <p className="chapter-dek">{chapter.dek}</p>
      <div className="stage-progress" aria-hidden="true"><i /></div>
      <CampaignLinks />
    </div>
  );
}
