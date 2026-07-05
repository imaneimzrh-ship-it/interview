export default function SunMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="3" fill="#F5A524"/>
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = Math.PI * deg / 180
        return <line key={i} x1={7 + 4*Math.cos(r)} y1={7 + 4*Math.sin(r)} x2={7 + 5.5*Math.cos(r)} y2={7 + 5.5*Math.sin(r)} stroke="#F5A524" strokeWidth="1.2" strokeLinecap="round"/>
      })}
    </svg>
  )
}
