all:

modules = modules/friendlyshared.js \
		  modules/friendlytag.js \
		  modules/friendlytalkback.js \
		  modules/twinklebatchdelete.js \
		  modules/twinklebatchundelete.js \
		  modules/twinkleconfig.js \
		  modules/twinklecopyvio.js \
		  modules/twinkledelimages.js \
		  modules/twinklediff.js \
		  modules/twinklefluff.js \
		  modules/twinkleimage.js \
		  modules/twinkleprotect.js \
		  modules/twinklespeedy.js \
		  modules/twinkleunlink.js \
		  modules/twinklewarn.js \
		  modules/twinklexfd.js

deploy: twinkle.js morebits.js morebits.css $(modules)
	./sync.pl --deploy $^

.PHONY: deploy all
