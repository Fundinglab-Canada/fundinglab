// Trending funding programs by province, shown on the Grant Writing page.
// Summaries only: intakes and rules change, so the page always tells readers to confirm with the official program.
// Featured programs (REDIP, RTRI) link to their Funding Lab guide pages.

export type TrendingGrant = { name: string; summary: string; href?: string };
export type TrendingRegion = { id: string; name: string; grants: TrendingGrant[] };

export const TRENDING_NATIONAL: TrendingGrant[] = [
  { name: "Regional Tariff Response Initiative (RTRI)", summary: "Non-repayable liquidity and pivot funding, plus interest-free loans, for businesses hit by U.S. tariffs. Delivered by each regional development agency.", href: "/grants/rtri" },
  { name: "Industrial Research Assistance Program (NRC IRAP)", summary: "Advisory services and non-repayable funding for technology innovation projects at small and medium-sized businesses." },
  { name: "SR&ED tax incentive", summary: "Refundable and non-refundable tax credits for eligible research and experimental development." },
  { name: "CanExport SMEs", summary: "Cost-share funding for marketing and business development in new international markets." },
  { name: "Canada Summer Jobs", summary: "Wage subsidies for employers who hire young people over the summer." },
];

export const TRENDING_BY_PROVINCE: TrendingRegion[] = [
  { id: "BC", name: "British Columbia", grants: [
    { name: "Rural Economic Diversification and Infrastructure Program (REDIP)", summary: "Up to $1M for economic infrastructure that creates jobs in rural B.C., led by local governments, First Nations or non-profits with business partners.", href: "/grants/redip" },
    { name: "RTRI — PacifiCan", summary: "B.C. delivery of the tariff response initiative: liquidity support and pivot projects.", href: "/grants/rtri" },
    { name: "B.C. Employer Training Grant", summary: "Cost sharing for training current and new employees." },
  ] },
  { id: "AB", name: "Alberta", grants: [
    { name: "RTRI — PrairiesCan", summary: "Tariff response funding for Alberta businesses." },
    { name: "Alberta Innovates programs", summary: "Funding streams for technology development, commercialization and research partnerships." },
    { name: "Canada-Alberta Job Grant", summary: "Cost sharing for employer-driven training." },
  ] },
  { id: "SK", name: "Saskatchewan", grants: [
    { name: "RTRI — PrairiesCan", summary: "Tariff response funding for Saskatchewan businesses." },
    { name: "Saskatchewan Technology Start-up Incentive (STSI)", summary: "Tax credit for investors in eligible early-stage Saskatchewan technology start-ups." },
    { name: "Canada-Saskatchewan Job Grant", summary: "Cost sharing for employer-driven training." },
  ] },
  { id: "MB", name: "Manitoba", grants: [
    { name: "RTRI — PrairiesCan", summary: "Tariff response funding for Manitoba businesses." },
    { name: "Canada-Manitoba Job Grant", summary: "Cost sharing for employer-driven training." },
  ] },
  { id: "ON", name: "Ontario", grants: [
    { name: "RTRI — FedDev Ontario / FedNor", summary: "Tariff response funding for Ontario businesses, delivered by FedDev Ontario in the south and FedNor in the north." },
    { name: "Regional Development Program", summary: "Provincial funding for business investment and job creation in eastern and southwestern Ontario." },
    { name: "Canada-Ontario Job Grant", summary: "Cost sharing for employer-driven training." },
  ] },
  { id: "QC", name: "Quebec", grants: [
    { name: "RTRI — CED Quebec", summary: "Tariff response funding for Quebec businesses." },
    { name: "Investissement Québec programs", summary: "Financing and support for business investment, productivity and innovation projects." },
  ] },
  { id: "ATL", name: "Atlantic Canada (NB, NS, PE, NL)", grants: [
    { name: "RTRI — ACOA", summary: "Tariff response funding for Atlantic businesses." },
    { name: "ACOA Business Development Program", summary: "Interest-free repayable contributions for starting, expanding or modernizing a business." },
    { name: "ACOA Regional Economic Growth through Innovation", summary: "Support for business scale-up, productivity and innovation." },
  ] },
  { id: "TERR", name: "Territories (YT, NT, NU)", grants: [
    { name: "RTRI — CanNor", summary: "Tariff response funding for northern businesses." },
    { name: "CanNor economic development programs", summary: "Funding for northern business growth and economic diversification." },
  ] },
];
