all:

modules = modules/friendlyshared.js \
		  modules/friendlytag.js \
		  modules/friendlytalkback.js \
		  modules/twinklearv.js \
		  modules/twinklebatchdelete.js \
		  modules/twinklebatchundelete.js \
		  modules/twinkleblock.js \
		  modules/twinkleclose.js \
		  modules/twinkleconfig.js \
		  modules/twinklecopyvio.js \
		  modules/twinklediff.js \
		  modules/twinklefluff.js \
		  modules/twinkleimage.js \
		  modules/twinkleprotect.js \
		  modules/twinklespeedy.js \
		  modules/twinkleunlink.js \
		  modules/twinklewarn.js \
		  modules/twinklexfd.js

deploy: twinkle.js morebits.js morebits.css $(modules)
	./sync.pl ${ARGS} --deploy $^

test: twinkle.js morebits.js morebits.css $(modules)
	./sync.pl ${ARGS} --lang=test --family=wikipedia --push $^

.PHONY: deploy test all
