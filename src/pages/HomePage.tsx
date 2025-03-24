"use client"

import React from "react"

import { useState } from "react"
import { Link } from "react-router-dom"
import { Search, Star, Shield, Clock, ArrowRight, CheckCircle } from "lucide-react"
import { supabase } from "../lib/supabase"

function HomePage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) return

    setIsSubmitting(true)

    try {
      // Store email in Supabase
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert([{ email, subscribed_at: new Date().toISOString() }])

      if (error) throw error

      setSubscribed(true)
      setEmail("")
    } catch (error) {
      console.error("Error subscribing to newsletter:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Featured worker categories
  const categories = [
    { name: "Plumbers", icon: "🔧", count: 124 },
    { name: "Electricians", icon: "⚡", count: 98 },
    { name: "Carpenters", icon: "🪚", count: 87 },
    { name: "Painters", icon: "🖌️", count: 65 },
    { name: "Gardeners", icon: "🌱", count: 53 },
    { name: "Cleaners", icon: "🧹", count: 112 },
  ]

  // Testimonials
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Homeowner",
      content:
        "I found a reliable plumber within hours of posting my job. The whole process was seamless and the work was completed to a high standard.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Electrician",
      content:
        "As an electrician, WorkerConnect has helped me find consistent work in my area. The platform is easy to use and I've built a great client base.",
      rating: 5,
    },
    {
      name: "Emma Rodriguez",
      role: "Property Manager",
      content:
        "Managing multiple properties means I need reliable workers fast. WorkerConnect has become my go-to platform for finding quality professionals.",
      rating: 4,
    },
  ]

  return (
    <div className="bg-[#F5F5DC]">
      {/* Hero Section */}
      <section className="relative bg-[#CC7357] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Connect with Skilled Workers in Your Area
              </h1>
              <p className="mt-6 text-lg md:text-xl opacity-90">
                Find reliable professionals for your home improvement, repair, and maintenance needs, or offer your
                skills to those who need them.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/search"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md bg-white text-[#CC7357] hover:bg-gray-100"
                >
                  Find Workers
                  <Search className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-6 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-[#B66347]"
                >
                  Join as a Worker
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="bg-white p-6 rounded-lg shadow-xl">
                <div className="flex items-center mb-4">
                  <img
                    src="/placeholder.svg?height=60&width=60"
                    alt="Worker profile"
                    className="h-15 w-15 rounded-full mr-4"
                  />
                  <div>
                    <h3 className="text-gray-900 font-medium">John Carpenter</h3>
                    <div className="flex items-center text-yellow-500">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <span className="ml-1 text-gray-600 text-sm">(48 reviews)</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">
                  "I've been a carpenter for 15 years. I specialize in custom furniture and home renovations."
                </p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>$45/hour</span>
                  <span>Available today</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-lg shadow-xl">
                <div className="flex items-center mb-2">
                  <img
                    src="/placeholder.svg?height=50&width=50"
                    alt="Worker profile"
                    className="h-12 w-12 rounded-full mr-3"
                  />
                  <div>
                    <h3 className="text-gray-900 font-medium">Lisa Plumber</h3>
                    <div className="flex items-center text-yellow-500">
                      <Star className="h-3 w-3 fill-current" />
                      <Star className="h-3 w-3 fill-current" />
                      <Star className="h-3 w-3 fill-current" />
                      <Star className="h-3 w-3 fill-current" />
                      <Star className="h-3 w-3 fill-current" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>$55/hour</span>
                  <span>5 years exp.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#F5F5DC] rounded-t-3xl"></div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How WorkerConnect Works</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              We make it easy to find skilled professionals or get hired for your expertise
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-[#FFF8F6] rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-[#CC7357]" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Search & Connect</h3>
              <p className="text-gray-600">
                Browse through our directory of skilled workers or post a job to receive quotes from professionals.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-[#FFF8F6] rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-[#CC7357]" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Verified Professionals</h3>
              <p className="text-gray-600">
                All workers are verified and reviewed by customers to ensure quality and reliability.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="w-16 h-16 bg-[#FFF8F6] rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="h-8 w-8 text-[#CC7357]" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Book & Pay</h3>
              <p className="text-gray-600">
                Schedule appointments, track work progress, and make secure payments all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Explore Categories</h2>
            <p className="mt-4 text-xl text-gray-600">Find the right professional for any job</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/search?category=${category.name}`}
                className="bg-[#FFF8F6] hover:bg-[#FFEEE8] p-6 rounded-lg text-center transition-colors"
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="font-medium text-gray-900 mb-1">{category.name}</h3>
                <p className="text-sm text-gray-500">{category.count} professionals</p>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/search" className="inline-flex items-center text-[#CC7357] hover:text-[#B66347] font-medium">
              View all categories
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">What Our Users Say</h2>
            <p className="mt-4 text-xl text-gray-600">Thousands of happy customers and workers</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-lg shadow-md">
                <div className="flex items-center text-yellow-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < testimonial.rating ? "fill-current" : "text-gray-300"}`} />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <div className="bg-[#CC7357] text-white h-10 w-10 rounded-full flex items-center justify-center mr-3">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-[#FFF8F6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Why Choose WorkerConnect?</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-[#CC7357] mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900 text-lg">Verified Professionals</h3>
                    <p className="text-gray-600">All workers undergo a verification process to ensure quality.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-[#CC7357] mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900 text-lg">Secure Payments</h3>
                    <p className="text-gray-600">
                      Your payments are protected until the job is completed to your satisfaction.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-[#CC7357] mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900 text-lg">Transparent Reviews</h3>
                    <p className="text-gray-600">
                      Honest feedback from real customers helps you make informed decisions.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-[#CC7357] mt-1 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900 text-lg">Flexible Scheduling</h3>
                    <p className="text-gray-600">Book services at times that work for your schedule.</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md bg-[#CC7357] text-white hover:bg-[#B66347]"
                >
                  Join WorkerConnect Today
                </Link>
              </div>
            </div>
            <div className="relative">
              <img
                src="/placeholder.svg?height=400&width=500"
                alt="Happy customer with worker"
                className="rounded-lg shadow-xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-lg shadow-lg">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-full mr-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">10,000+</p>
                    <p className="text-sm text-gray-500">Completed Jobs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#CC7357] rounded-2xl p-8 md:p-12 text-white">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Stay Updated with WorkerConnect</h2>
              <p className="text-lg opacity-90 mb-8">
                Subscribe to our newsletter for tips, new service providers, and special offers.
              </p>

              {subscribed ? (
                <div className="bg-white bg-opacity-20 p-4 rounded-lg inline-flex items-center">
                  <CheckCircle className="h-6 w-6 mr-2" />
                  <span>Thank you for subscribing!</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-grow px-4 py-3 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#B66347]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-white text-[#CC7357] font-medium rounded-md hover:bg-gray-100 disabled:opacity-75"
                  >
                    {isSubmitting ? "Subscribing..." : "Subscribe"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Join thousands of customers and professionals on WorkerConnect today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/search"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md bg-[#CC7357] text-white hover:bg-[#B66347]"
            >
              Find Workers
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-6 py-3 border border-[#CC7357] text-base font-medium rounded-md text-[#CC7357] hover:bg-[#FFF8F6]"
            >
              Offer Your Services
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage


