import { Shield, Award, Clock, CheckCircle } from "lucide-react"

export function TrustBadges() {
  const badges = [
    {
      icon: Shield,
      title: "Verified Professionals",
      description: "All workers are background-checked and verified",
    },
    {
      icon: Award,
      title: "Quality Guarantee",
      description: "Satisfaction guaranteed or your money back",
    },
    {
      icon: Clock,
      title: "Fast Response",
      description: "Get matched with professionals within hours",
    },
    {
      icon: CheckCircle,
      title: "Secure Payments",
      description: "Your payment is protected and secure",
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Why Choose WorkerConnect</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {badges.map((badge, index) => (
          <div key={index} className="flex flex-col items-center text-center">
            <div className="bg-[#F5F5DC] p-4 rounded-full mb-4">
              <badge.icon className="h-8 w-8 text-[#CC7357]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{badge.title}</h3>
            <p className="text-gray-600">{badge.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

