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

deploy: twinkle.js twinkle.css twinkle-pagestyles.css morebits.js morebits.css select2/select2.min.js select2/select2.min.css $(modules)
	./sync.pl ${ARGS} --deploy $^

test: twinkle.js morebits.js morebits.css $(modules)
	./sync.pl ${ARGS} --lang=test --family=wikipedia --push $^

.PHONY: deploy test all
