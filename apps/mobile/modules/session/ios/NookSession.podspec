Pod::Spec.new do |s|
  s.name = 'NookSession'
  s.version = '0.1.0'
  s.summary = 'Shared native authentication session vault'
  s.description = 'Shared native authentication session vault'
  s.license = { :type => 'MIT' }
  s.author = 'nook'
  s.homepage = 'https://nook.today'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
